"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, requireAdminUser } from "@/lib/admin/auth";
import {
  canUpdateOrder,
  hasAdminPermission,
  isSuperAdmin,
} from "@/lib/admin/permissions";
import { createOrLinkCustomer, normalizeCustomerEmail } from "@/lib/customers";
import {
  buildOrderStoragePath,
  buildSnapshotUploadFile,
  getSnapshotUploadFileRecords,
  isInlineBrowserUrl,
  validateSelectedFile,
  type CartPendingUploadSource,
  type OrderStoredFileMetadata,
} from "@/lib/storage/order-files";
import {
  getEffectiveUploadLimitMb,
  getServerActionUploadLimitMessage,
} from "@/lib/storage/upload-limits";
import {
  deleteFilesFromSupabaseStorage,
  uploadFileToSupabaseStorage,
} from "@/lib/storage/supabase-storage";
import {
  DEFAULT_GERMAN_TAX_RATE,
  DEFAULT_ORDER_CURRENCY,
  calculateOrderFinancials,
  getOrderPaymentStatus,
  normalizeDocumentType,
  normalizeNonNegativeNumber as normalizeMoneyValue,
  normalizePaymentStatus,
} from "@/lib/orders/finance";
import { buildCustomerOrderConfirmationEmail } from "@/lib/orders/confirmation-email";
import { createOrderDocumentShareToken } from "@/lib/orders/document-share";
import {
  buildSharedOrderDocumentHref,
  normalizeOrderDocumentQueryType,
} from "@/lib/orders/documents";
import {
  buildManualOrderItem,
  parseManualOrderPayload,
} from "@/lib/orders/manual";
import {
  createUniqueOrderCode,
  isLegacyNumericOrderLookup,
  normalizePublicOrderLookup,
} from "@/lib/orders/order-number";
import { canArchiveOrder as canArchiveOrderRecord } from "@/lib/orders/reporting";
import { normalizeEmailAddress } from "@/lib/email/address";
import { sendSmtpMail } from "@/lib/email/smtp";
import { getConfiguredAppBaseUrl, getPublicAppBaseUrl } from "@/lib/env";
import type { CartItem } from "@/lib/store/cart";
import { normalizeServiceConfiguration } from "@/lib/services/configuration/normalize";
import {
  extractStoredOrderTextInputs,
  getSnapshotOrBuildLegacy,
  normalizeLegacySelectedOptions,
  parseConfigurationSnapshot,
  wrapOrderTextInputsWithSnapshot,
  type LegacyConfigurationSelectedOptions,
  type LegacyConfigurationTextInputs,
  type ServiceConfigurationSnapshot,
} from "@/lib/services/configuration/snapshot";

type MutableJsonObject = Record<string, Prisma.InputJsonValue>;

type OrderFinancialUpdateSource = {
  subtotalNet: number;
  discountType: string;
  discountValue: number;
  taxRate: number;
  paymentStatus: string;
  paidAmount: number | null;
  paymentMethod: string;
  paymentNotes: string;
  documentType: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  internalNotes: string;
  customerNotes: string;
};

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      publicOrderCode: string;
    }
  | { ok: false; error: string };

export type CustomerOrderSummary = {
  createdAt: string;
  itemCount: number;
  legacyOrderNumber: string;
  publicOrderCode: string;
  status: string;
  statusLabel: string;
  totalAmount: number;
};

export type CustomerOrderDocumentLink = {
  href: string;
  label: string;
};

export type CustomerOrderDetailItem = {
  fileNames: string[];
  id: string;
  itemTotal: number;
  notes: string | null;
  optionLines: string[];
  quantity: number;
  serviceName: string;
};

export type CustomerOrderDetail = {
  createdAt: string;
  customerNotes: string | null;
  documentLinks: CustomerOrderDocumentLink[];
  items: CustomerOrderDetailItem[];
  legacyOrderNumber: string;
  nextStep: string;
  paymentStatusLabel: string | null;
  publicOrderCode: string;
  status: string;
  statusLabel: string;
  totalAmount: number;
};

type CreateOrderItemInput = {
  cartItemId: string;
  serviceId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedOptions: LegacyConfigurationSelectedOptions;
  textInputs: LegacyConfigurationTextInputs;
  totalPrice: number;
  designData?: CartItem["designData"];
  configurationSnapshot?: ServiceConfigurationSnapshot;
  orderNotes?: string;
};

type CreateOrderInput = {
  items: CreateOrderItemInput[];
  totalAmount: number;
};

type CheckoutUploadDescriptor = {
  formKey: string;
  cartItemId: string;
  source: CartPendingUploadSource;
  fieldKey: string;
  fieldLabel: string;
  slotIndex: number;
  customerLabel: string;
};

type ParsedCheckoutRequest = {
  customerName: string;
  customerEmail: string;
  payload: CreateOrderInput;
  uploads: CheckoutUploadDescriptor[];
};

type UploadFieldDefinition = {
  source: CartPendingUploadSource;
  key: string;
  label: string;
  accept: string;
  maxFiles: number;
  maxFileSizeMb: number | null;
  allowCustomerFileLabel: boolean;
};

type UploadedOrderFileRecord = OrderStoredFileMetadata & {
  cartItemId: string;
  slotIndex: number;
};

class CheckoutUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutUploadError";
  }
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeOrderStatus(value: string): string {
  const allowedStatuses = new Set([
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELED",
  ]);

  return allowedStatuses.has(value) ? value : "PAID";
}

function normalizeInternalStatus(value: string): string {
  const allowedStatuses = new Set([
    "NEW",
    "IN_REVIEW",
    "IN_PRODUCTION",
    "WAITING_CUSTOMER",
    "READY",
    "DONE",
  ]);

  return allowedStatuses.has(value) ? value : "NEW";
}

function normalizePriority(value: string): string {
  const allowedPriorities = new Set(["LOW", "NORMAL", "HIGH", "URGENT"]);
  return allowedPriorities.has(value) ? value : "NORMAL";
}

function normalizeCheckoutString(value: string): string {
  return value.trim();
}

function normalizeOrderQuantity(value: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.trunc(value))
    : 1;
}

function normalizeUnknownMoneyValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? normalizeMoneyValue(value, fallback)
    : fallback;
}

function normalizeDateInput(value: string): Date | null {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedDate = new Date(`${normalizedValue}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function resolvePaidAmount(
  paymentStatus: string,
  totalGross: number,
  paidAmount: number | null,
): number {
  const normalizedPaidAmount = normalizeMoneyValue(paidAmount ?? 0);

  switch (paymentStatus) {
    case "PAID":
    case "REFUNDED":
      return totalGross;
    case "PARTIALLY_PAID":
      return Math.min(totalGross, normalizedPaidAmount);
    case "UNPAID":
    default:
      return 0;
  }
}

async function getNextOrderNumber(): Promise<number> {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  return lastOrder?.orderNumber ? lastOrder.orderNumber + 1 : 10000;
}

async function addOrderActivity({
  orderId,
  adminUserId,
  type,
  message,
}: {
  orderId: string;
  adminUserId: string | null;
  type: string;
  message: string;
}): Promise<void> {
  await prisma.orderActivity.create({
    data: {
      orderId,
      adminUserId,
      type,
      message,
    },
  });
}

function buildCheckoutTrackingUrl(): string | null {
  const appBaseUrl = getConfiguredAppBaseUrl() || getPublicAppBaseUrl();

  if (!appBaseUrl) {
    return null;
  }

  try {
    return new URL("/track", appBaseUrl).toString();
  } catch {
    return null;
  }
}

async function sendCheckoutOrderConfirmationEmail({
  orderId,
  orderNumber,
  publicOrderCode,
  customerName,
  customerEmail,
  createdAt,
  totalGross,
  items,
}: {
  orderId: string;
  orderNumber: string;
  publicOrderCode: string | null;
  customerName: string;
  customerEmail: string;
  createdAt: Date;
  totalGross: number;
  items: CreateOrderItemInput[];
}): Promise<void> {
  const recipient = normalizeEmailAddress(customerEmail);

  if (!recipient) {
    return;
  }

  try {
    const confirmationEmail = buildCustomerOrderConfirmationEmail({
      orderNumber,
      publicOrderCode,
      orderDate: createdAt,
      customerName,
      trackUrl: buildCheckoutTrackingUrl(),
      contactEmail: process.env.SMTP_FROM || "info@quickdesign.de",
      currency: DEFAULT_ORDER_CURRENCY,
      totalGross,
      items: items.map((item) => ({
        serviceName: item.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        selectedOptions: item.selectedOptions,
        configurationSnapshot: item.configurationSnapshot,
      })),
    });

    await sendSmtpMail({
      to: recipient,
      subject: confirmationEmail.subject,
      text: confirmationEmail.text,
      html: confirmationEmail.html,
    });
  } catch (error) {
    console.error("Checkout confirmation email failed:", {
      orderId,
      orderNumber,
      customerEmail: recipient,
      error,
    });
  }
}

function revalidateOrderAdminViews(orderId: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}/document`);
  revalidatePath("/admin/reports");
}

function serializeSelectedOptions(
  selectedOptions: LegacyConfigurationSelectedOptions,
): Prisma.InputJsonObject {
  const serializedOptions: MutableJsonObject = {};

  Object.entries(selectedOptions).forEach(([key, option]) => {
    const optionValue: MutableJsonObject = {
      optionName: option.optionName,
      valueName: option.valueName,
      price: option.price,
    };

    serializedOptions[key] = optionValue;
  });

  return serializedOptions;
}

function serializeTextInputs(
  textInputs: LegacyConfigurationTextInputs,
): Prisma.InputJsonObject {
  const serializedInputs: MutableJsonObject = {};

  Object.entries(textInputs).forEach(([key, input]) => {
    const serializedInput: MutableJsonObject = {
      optionName: input.optionName,
      value: input.value,
    };

    if (input.url) {
      serializedInput.url = input.url;
    }

    serializedInputs[key] = serializedInput;
  });

  return serializedInputs;
}

function serializeConfigurationSnapshot(
  snapshot: ServiceConfigurationSnapshot,
): Prisma.InputJsonObject {
  return {
    version: snapshot.version,
    serviceId: snapshot.serviceId,
    serviceName: snapshot.serviceName,
    pricingModel: snapshot.pricingModel,
    calculatedPrice: {
      currency: snapshot.calculatedPrice.currency,
      total: snapshot.calculatedPrice.total,
      basePrice: snapshot.calculatedPrice.basePrice,
      baseUnitPrice: snapshot.calculatedPrice.baseUnitPrice,
      optionPriceImpact: snapshot.calculatedPrice.optionPriceImpact,
      quantity: snapshot.calculatedPrice.quantity,
    },
    quantity: snapshot.quantity,
    selectedOptions: snapshot.selectedOptions.map((option) => ({
      fieldKey: option.fieldKey,
      fieldLabel: option.fieldLabel,
      valueKey: option.valueKey,
      valueLabel: option.valueLabel,
      priceImpact: option.priceImpact,
    })),
    selectedPricingTier: snapshot.selectedPricingTier
      ? {
          id: snapshot.selectedPricingTier.id,
          label: snapshot.selectedPricingTier.label,
          quantity: snapshot.selectedPricingTier.quantity,
          price: snapshot.selectedPricingTier.price,
        }
      : null,
    area: snapshot.area
      ? {
          widthCm: snapshot.area.widthCm,
          heightCm: snapshot.area.heightCm,
          areaSqm: snapshot.area.areaSqm,
          pricePerSqm: snapshot.area.pricePerSqm,
        }
      : null,
    uploadFields: snapshot.uploadFields.map((field) => ({
      fieldKey: field.fieldKey,
      fieldLabel: field.fieldLabel,
      files: field.files.map((file) => ({
        fileName: file.fileName,
        originalName: file.originalName ?? file.fileName,
        customerLabel: file.customerLabel,
        fileType: file.fileType,
        contentType: file.contentType ?? null,
        fileSize: file.fileSize,
        fileUrl: file.fileUrl,
        bucket: file.bucket ?? null,
        path: file.path ?? null,
        uploadedAt: file.uploadedAt ?? null,
      })),
    })),
    textFields: snapshot.textFields.map((field) => ({
      fieldKey: field.fieldKey,
      fieldLabel: field.fieldLabel,
      value: field.value,
      kind: field.kind,
    })),
    size: snapshot.size
      ? {
          fieldKey: snapshot.size.fieldKey,
          fieldLabel: snapshot.size.fieldLabel,
          value: snapshot.size.value,
        }
      : null,
    color: snapshot.color
      ? {
          fieldKey: snapshot.color.fieldKey,
          fieldLabel: snapshot.color.fieldLabel,
          value: snapshot.color.value,
          hex: snapshot.color.hex,
        }
      : null,
    design: snapshot.design
      ? {
          model: snapshot.design.model,
          color: snapshot.design.color,
          frontLogoCount: snapshot.design.frontLogoCount,
          backLogoCount: snapshot.design.backLogoCount,
        }
      : null,
    customerNotes: snapshot.customerNotes,
    orderNotes: snapshot.orderNotes,
    customQuote: snapshot.customQuote,
  };
}

function serializeStoredOrderTextInputs(
  textInputs: LegacyConfigurationTextInputs,
  configurationSnapshot: ServiceConfigurationSnapshot,
): Prisma.InputJsonObject {
  const wrappedInputs = wrapOrderTextInputsWithSnapshot(
    textInputs,
    configurationSnapshot,
  );

  return {
    entries: serializeTextInputs(wrappedInputs.entries),
    configurationSnapshot: wrappedInputs.configurationSnapshot
      ? serializeConfigurationSnapshot(wrappedInputs.configurationSnapshot)
      : null,
  };
}

function serializeDesignData(
  designData: CartItem["designData"],
): Prisma.InputJsonValue | undefined {
  if (!designData) {
    return undefined;
  }

  return {
    model: designData.model,
    color: designData.color,
    frontLogos: designData.frontLogos.map((logo) => ({
      id: logo.id,
      url: logo.url,
      x: logo.x,
      y: logo.y,
      width: logo.width,
      height: logo.height,
    })),
    backLogos: designData.backLogos.map((logo) => ({
      id: logo.id,
      url: logo.url,
      x: logo.x,
      y: logo.y,
      width: logo.width,
      height: logo.height,
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeStoredUrl(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return isInlineBrowserUrl(value) ? undefined : value;
}

function sanitizeStoredTextInputs(
  textInputs: LegacyConfigurationTextInputs,
): LegacyConfigurationTextInputs {
  const sanitizedInputs: LegacyConfigurationTextInputs = {};

  Object.entries(textInputs).forEach(([key, input]) => {
    const sanitizedUrl = sanitizeStoredUrl(input.url);

    sanitizedInputs[key] = sanitizedUrl
      ? {
          optionName: input.optionName,
          value: input.value,
          url: sanitizedUrl,
        }
      : {
          optionName: input.optionName,
          value: input.value,
        };
  });

  return sanitizedInputs;
}

function sanitizeStoredConfigurationSnapshot(
  snapshot: ServiceConfigurationSnapshot | undefined,
): ServiceConfigurationSnapshot | undefined {
  if (!snapshot) {
    return undefined;
  }

  return {
    ...snapshot,
    uploadFields: snapshot.uploadFields.map((field) => ({
      ...field,
      files: field.files.map((file) => ({
        ...file,
        originalName: file.originalName ?? file.fileName,
        contentType: file.contentType ?? file.fileType,
        fileUrl: sanitizeStoredUrl(file.fileUrl) ?? null,
        bucket: file.bucket ?? null,
        path: file.path ?? null,
        uploadedAt: file.uploadedAt ?? null,
      })),
    })),
  };
}

function parseDesignData(value: unknown): CartItem["designData"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const model = normalizeOptionalString(
    typeof value.model === "string" ? value.model : null,
  );
  const color = normalizeOptionalString(
    typeof value.color === "string" ? value.color : null,
  );

  if (!model || !color) {
    return undefined;
  }

  const parseLogos = (
    logosValue: unknown,
  ): NonNullable<CartItem["designData"]>["frontLogos"] => {
    if (!Array.isArray(logosValue)) {
      return [];
    }

    return logosValue
      .map((logo) => {
        if (!isRecord(logo)) {
          return null;
        }

        const id = normalizeOptionalString(
          typeof logo.id === "string" ? logo.id : null,
        );
        const url = sanitizeStoredUrl(
          typeof logo.url === "string" ? logo.url : null,
        );
        const x =
          typeof logo.x === "number" && Number.isFinite(logo.x) ? logo.x : null;
        const y =
          typeof logo.y === "number" && Number.isFinite(logo.y) ? logo.y : null;
        const width =
          typeof logo.width === "number" && Number.isFinite(logo.width)
            ? logo.width
            : null;
        const height =
          typeof logo.height === "number" && Number.isFinite(logo.height)
            ? logo.height
            : null;

        if (!id || url === undefined || x === null || y === null) {
          return null;
        }

        if (width === null || height === null) {
          return null;
        }

        return {
          id,
          url,
          x,
          y,
          width,
          height,
        };
      })
      .filter(
        (
          logo,
        ): logo is NonNullable<CartItem["designData"]>["frontLogos"][number] =>
          logo !== null,
      );
  };

  return {
    model:
      model === "tee" ||
      model === "tank" ||
      model === "hoodie" ||
      model === "pullover" ||
      model === "longsleeve" ||
      model === "jacket"
        ? model
        : "tee",
    color,
    frontLogos: parseLogos(value.frontLogos),
    backLogos: parseLogos(value.backLogos),
  };
}

function parseCheckoutItem(value: unknown): CreateOrderItemInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const cartItemId = normalizeOptionalString(
    typeof value.cartItemId === "string" ? value.cartItemId : null,
  );
  const serviceId = normalizeOptionalString(
    typeof value.serviceId === "string" ? value.serviceId : null,
  );
  const name = normalizeOptionalString(
    typeof value.name === "string" ? value.name : null,
  );

  if (!cartItemId || !serviceId || !name) {
    return null;
  }

  const parsedTextInputs = extractStoredOrderTextInputs(value.textInputs);

  return {
    cartItemId,
    serviceId,
    name,
    basePrice: normalizeUnknownMoneyValue(value.basePrice),
    quantity:
      typeof value.quantity === "number" && Number.isFinite(value.quantity)
        ? value.quantity
        : 1,
    selectedOptions: normalizeLegacySelectedOptions(value.selectedOptions),
    textInputs: sanitizeStoredTextInputs(parsedTextInputs.textInputs),
    totalPrice: normalizeUnknownMoneyValue(value.totalPrice),
    designData: parseDesignData(value.designData),
    configurationSnapshot: sanitizeStoredConfigurationSnapshot(
      parseConfigurationSnapshot(value.configurationSnapshot) ??
        parsedTextInputs.configurationSnapshot ??
        undefined,
    ),
    orderNotes:
      normalizeOptionalString(
        typeof value.orderNotes === "string" ? value.orderNotes : null,
      ) ?? undefined,
  };
}

function parseCheckoutUploadDescriptor(
  value: unknown,
): CheckoutUploadDescriptor | null {
  if (!isRecord(value)) {
    return null;
  }

  const formKey = normalizeOptionalString(
    typeof value.formKey === "string" ? value.formKey : null,
  );
  const cartItemId = normalizeOptionalString(
    typeof value.cartItemId === "string" ? value.cartItemId : null,
  );
  const source =
    value.source === "option" || value.source === "upload"
      ? value.source
      : null;
  const fieldKey = normalizeOptionalString(
    typeof value.fieldKey === "string" ? value.fieldKey : null,
  );
  const fieldLabel = normalizeOptionalString(
    typeof value.fieldLabel === "string" ? value.fieldLabel : null,
  );
  const slotIndex =
    typeof value.slotIndex === "number" && Number.isFinite(value.slotIndex)
      ? Math.max(0, Math.trunc(value.slotIndex))
      : null;

  if (!formKey || !cartItemId || !source || !fieldKey || !fieldLabel) {
    return null;
  }

  if (slotIndex === null) {
    return null;
  }

  return {
    formKey,
    cartItemId,
    source,
    fieldKey,
    fieldLabel,
    slotIndex,
    customerLabel:
      normalizeOptionalString(
        typeof value.customerLabel === "string" ? value.customerLabel : null,
      ) ?? "",
  };
}

function parseCheckoutRequest(formData: FormData): ParsedCheckoutRequest | null {
  const payloadRaw = getFormString(formData, "payload");

  if (!payloadRaw) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadRaw) as unknown;

    if (!isRecord(payload) || !Array.isArray(payload.items)) {
      return null;
    }

    const items = payload.items
      .map((item) => parseCheckoutItem(item))
      .filter((item): item is CreateOrderItemInput => item !== null);
    const rawUploads = Array.isArray(payload.uploads) ? payload.uploads : [];
    const uploads = rawUploads
      .map((upload) => parseCheckoutUploadDescriptor(upload))
      .filter((upload): upload is CheckoutUploadDescriptor => upload !== null);

    if (items.length !== payload.items.length) {
      return null;
    }

    if (uploads.length !== rawUploads.length) {
      return null;
    }

    return {
      customerName: normalizeCheckoutString(getFormString(formData, "name")),
      customerEmail: normalizeCheckoutString(getFormString(formData, "email")),
      payload: {
        items,
        totalAmount: normalizeUnknownMoneyValue(payload.totalAmount),
      },
      uploads,
    };
  } catch {
    return null;
  }
}

function buildUploadFieldDefinitionMap(
  config: ReturnType<typeof normalizeServiceConfiguration>,
): Map<string, UploadFieldDefinition> {
  const definitions = new Map<string, UploadFieldDefinition>();

  config.fields.forEach((field) => {
    if (field.kind !== "file") {
      return;
    }

    definitions.set(`option:${field.key}`, {
      source: "option",
      key: field.key,
      label: field.label,
      accept: field.accept ?? "*/*",
      maxFiles: 1,
      maxFileSizeMb: getEffectiveUploadLimitMb(null),
      allowCustomerFileLabel: false,
    });
  });

  config.uploadSettings.fields.forEach((field) => {
    definitions.set(`upload:${field.key}`, {
      source: "upload",
      key: field.key,
      label: field.label,
      accept: field.accept,
      maxFiles: field.maxFiles,
      maxFileSizeMb: getEffectiveUploadLimitMb(field.maxFileSizeMb),
      allowCustomerFileLabel: field.allowCustomerFileLabel,
    });
  });

  return definitions;
}

async function uploadCheckoutFiles(input: {
  formData: FormData;
  orderNumber: number;
  items: Array<{
    item: CreateOrderItemInput;
    itemIndex: number;
  }>;
  uploads: CheckoutUploadDescriptor[];
}): Promise<UploadedOrderFileRecord[]> {
  if (input.uploads.length === 0) {
    return [];
  }

  const itemsByCartItemId = new Map(
    input.items.map((entry) => [entry.item.cartItemId, entry]),
  );
  const serviceIds = Array.from(
    new Set(
      input.uploads
        .map((upload) => itemsByCartItemId.get(upload.cartItemId)?.item.serviceId)
        .filter((serviceId): serviceId is string => typeof serviceId === "string"),
    ),
  );
  const services = await prisma.service.findMany({
    where: {
      id: { in: serviceIds },
    },
    include: {
      options: {
        include: {
          values: true,
        },
      },
    },
  });
  const serviceConfigById = new Map(
    services.map((service) => [
      service.id,
      buildUploadFieldDefinitionMap(normalizeServiceConfiguration(service)),
    ]),
  );
  const uploadsByField = new Map<string, number>();
  const uploadsBySlot = new Set<string>();

  input.uploads.forEach((upload) => {
    const counterKey = `${upload.cartItemId}:${upload.source}:${upload.fieldKey}`;
    uploadsByField.set(counterKey, (uploadsByField.get(counterKey) ?? 0) + 1);

    const slotKey = `${counterKey}:${upload.slotIndex}`;
    if (uploadsBySlot.has(slotKey)) {
      throw new CheckoutUploadError("Bitte w\u00e4hlen Sie eine g\u00fcltige Datei.");
    }

    uploadsBySlot.add(slotKey);
  });

  const uploadedFiles: UploadedOrderFileRecord[] = [];

  for (const upload of input.uploads) {
    const itemEntry = itemsByCartItemId.get(upload.cartItemId);

    if (!itemEntry) {
      throw new CheckoutUploadError("Bitte w\u00e4hlen Sie eine g\u00fcltige Datei.");
    }

    const fieldDefinitions = serviceConfigById.get(itemEntry.item.serviceId);

    if (!fieldDefinitions) {
      throw new CheckoutUploadError("Bitte w\u00e4hlen Sie eine g\u00fcltige Datei.");
    }

    const fieldDefinition = fieldDefinitions.get(
      `${upload.source}:${upload.fieldKey}`,
    );

    if (!fieldDefinition) {
      throw new CheckoutUploadError("Bitte w\u00e4hlen Sie eine g\u00fcltige Datei.");
    }

    const filesForField =
      uploadsByField.get(
        `${upload.cartItemId}:${upload.source}:${upload.fieldKey}`,
      ) ?? 0;

    if (filesForField > fieldDefinition.maxFiles) {
      throw new CheckoutUploadError("Bitte w\u00e4hlen Sie eine g\u00fcltige Datei.");
    }

    if (upload.slotIndex >= fieldDefinition.maxFiles) {
      throw new CheckoutUploadError("Bitte w\u00e4hlen Sie eine g\u00fcltige Datei.");
    }

    const uploadedFile = input.formData.get(upload.formKey);

    if (!(uploadedFile instanceof File)) {
      throw new CheckoutUploadError("Bitte w\u00e4hlen Sie eine g\u00fcltige Datei.");
    }

    const validationResult = validateSelectedFile(uploadedFile, {
      accept: fieldDefinition.accept,
      maxFileSizeMb: fieldDefinition.maxFileSizeMb,
      maxFileSizeMessage:
        fieldDefinition.maxFileSizeMb === getEffectiveUploadLimitMb(null)
          ? getServerActionUploadLimitMessage()
          : undefined,
    });

    if (!validationResult.ok) {
      throw new CheckoutUploadError(validationResult.message);
    }

    const path = buildOrderStoragePath({
      orderNumber: input.orderNumber,
      itemIndex: itemEntry.itemIndex + 1,
      fieldKey: fieldDefinition.key,
      slotIndex: upload.slotIndex,
      fileName: uploadedFile.name,
    });

    try {
      const storedFile = await uploadFileToSupabaseStorage({
        path,
        file: uploadedFile,
      });

      uploadedFiles.push({
        cartItemId: upload.cartItemId,
        slotIndex: upload.slotIndex,
        bucket: storedFile.bucket,
        path: storedFile.path,
        originalName: uploadedFile.name,
        customerLabel:
          fieldDefinition.allowCustomerFileLabel &&
          upload.customerLabel.trim() !== ""
            ? upload.customerLabel.trim()
            : null,
        fieldKey: fieldDefinition.key,
        fieldLabel: fieldDefinition.label,
        contentType:
          uploadedFile.type.trim() !== "" ? uploadedFile.type.trim() : null,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Supabase Storage upload failed:", error);
      throw new CheckoutUploadError("Datei konnte nicht hochgeladen werden.");
    }
  }

  return uploadedFiles;
}

function mergeUploadedFilesIntoSnapshot(
  snapshot: ServiceConfigurationSnapshot,
  uploadedFiles: UploadedOrderFileRecord[],
): ServiceConfigurationSnapshot {
  if (uploadedFiles.length === 0) {
    return snapshot;
  }

  const uploadedFilesByField = new Map<string, UploadedOrderFileRecord[]>();

  uploadedFiles.forEach((file) => {
    const currentFiles = uploadedFilesByField.get(file.fieldKey) ?? [];
    currentFiles.push(file);
    uploadedFilesByField.set(file.fieldKey, currentFiles);
  });

  const nextUploadFields = snapshot.uploadFields.map((field) => {
    const filesForField = uploadedFilesByField.get(field.fieldKey);

    if (!filesForField) {
      return field;
    }

    return {
      ...field,
      fieldLabel: filesForField[0]?.fieldLabel ?? field.fieldLabel,
      files: filesForField
        .sort((left, right) => left.slotIndex - right.slotIndex)
        .map((file) => buildSnapshotUploadFile(file)),
    };
  });

  uploadedFilesByField.forEach((filesForField, fieldKey) => {
    if (nextUploadFields.some((field) => field.fieldKey === fieldKey)) {
      return;
    }

    nextUploadFields.push({
      fieldKey,
      fieldLabel: filesForField[0]?.fieldLabel ?? fieldKey,
      files: filesForField
        .sort((left, right) => left.slotIndex - right.slotIndex)
        .map((file) => buildSnapshotUploadFile(file)),
    });
  });

  return {
    ...snapshot,
    uploadFields: nextUploadFields,
  };
}

function buildOrderFinancialUpdateData(input: OrderFinancialUpdateSource) {
  const financials = calculateOrderFinancials({
    subtotalNet: input.subtotalNet,
    discountType: input.discountType,
    discountValue: input.discountValue,
    taxRate: input.taxRate,
    currency: DEFAULT_ORDER_CURRENCY,
  });
  const paymentStatus = normalizePaymentStatus(input.paymentStatus);
  const paidAmount = resolvePaidAmount(
    paymentStatus,
    financials.totalGross,
    input.paidAmount,
  );

  return {
    financials,
    paymentStatus,
    paidAmount,
    paymentMethod: normalizeOptionalString(input.paymentMethod),
    paymentNotes: normalizeOptionalString(input.paymentNotes),
    documentType: normalizeDocumentType(input.documentType),
    invoiceNumber: normalizeOptionalString(input.invoiceNumber),
    invoiceDate: normalizeDateInput(input.invoiceDate),
    dueDate: normalizeDateInput(input.dueDate),
    internalNotes: normalizeOptionalString(input.internalNotes),
    customerNotes: normalizeOptionalString(input.customerNotes),
  };
}

export async function createOrder(formData: FormData): Promise<CreateOrderResult> {
  const parsedRequest = parseCheckoutRequest(formData);

  if (!parsedRequest) {
    return {
      ok: false,
      error:
        "Die Bestellung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    };
  }

  const uploadedStoragePaths: string[] = [];

  try {
    const { customerName, customerEmail, payload, uploads } = parsedRequest;

    if (!customerName || !customerEmail) {
      return {
        ok: false,
        error: "Bitte geben Sie Name und E-Mail-Adresse ein.",
      };
    }

    if (payload.items.length === 0) {
      return {
        ok: false,
        error: "Ihr Warenkorb ist leer.",
      };
    }

    const totalAmount = normalizeMoneyValue(
      payload.totalAmount,
      payload.items.reduce(
        (sum, item) => sum + normalizeMoneyValue(item.totalPrice),
        0,
      ),
    );
    const preparedItems = payload.items.map((item, itemIndex) => {
      const quantity = normalizeOrderQuantity(item.quantity);
      const totalPrice = normalizeMoneyValue(item.totalPrice);
      const sanitizedTextInputs = sanitizeStoredTextInputs(item.textInputs);
      const baseSnapshot = getSnapshotOrBuildLegacy({
        serviceId: item.serviceId,
        serviceName: item.name,
        basePrice: normalizeMoneyValue(item.basePrice),
        totalPrice,
        quantity,
        selectedOptions: item.selectedOptions,
        textInputs: sanitizedTextInputs,
        designData: item.designData,
        orderNotes: item.orderNotes,
        configurationSnapshot: sanitizeStoredConfigurationSnapshot(
          item.configurationSnapshot,
        ),
      });

      return {
        item,
        itemIndex,
        quantity,
        totalPrice,
        sanitizedTextInputs,
        configurationSnapshot: baseSnapshot,
      };
    });
    const customer = await createOrLinkCustomer({
      name: customerName,
      email: customerEmail,
    });
    const nextOrderNumber = await getNextOrderNumber();
    const publicOrderCode = await createUniqueOrderCode(prisma);
    const financials = calculateOrderFinancials({
      subtotalNet: totalAmount,
      discountType: "NONE",
      discountValue: 0,
      taxRate: 0,
      currency: DEFAULT_ORDER_CURRENCY,
    });
    const uploadedFiles = await uploadCheckoutFiles({
      formData,
      orderNumber: nextOrderNumber,
      items: preparedItems.map((entry) => ({
        item: entry.item,
        itemIndex: entry.itemIndex,
      })),
      uploads,
    });
    uploadedFiles.forEach((file) => uploadedStoragePaths.push(file.path));
    const uploadedFilesByCartItemId = new Map<string, UploadedOrderFileRecord[]>();

    uploadedFiles.forEach((file) => {
      const currentFiles = uploadedFilesByCartItemId.get(file.cartItemId) ?? [];
      currentFiles.push(file);
      uploadedFilesByCartItemId.set(file.cartItemId, currentFiles);
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber,
        customerId: customer.id,
        customerName,
        customerEmail,
        totalAmount: financials.totalGross,
        status: "PAID",
        subtotalNet: financials.subtotalNet,
        discountType: financials.discountType,
        discountValue: financials.discountValue,
        discountAmount: financials.discountAmount,
        taxRate: financials.taxRate,
        taxAmount: financials.taxAmount,
        totalNet: financials.totalNet,
        totalGross: financials.totalGross,
        currency: financials.currency,
        paymentStatus: "PAID",
        paidAmount: financials.totalGross,
        paymentMethod: "Simulierte Zahlung",
        documentType: "ORDER",
        items: {
          create: preparedItems.map((preparedItem) => {
            const uploadedFilesForItem =
              uploadedFilesByCartItemId.get(preparedItem.item.cartItemId) ?? [];
            const configurationSnapshot = mergeUploadedFilesIntoSnapshot(
              preparedItem.configurationSnapshot,
              uploadedFilesForItem,
            );
            const serializedDesignData = serializeDesignData(
              preparedItem.item.designData,
            );

            return {
              serviceId: preparedItem.item.serviceId,
              serviceName: preparedItem.item.name,
              quantity: preparedItem.quantity,
              price: preparedItem.totalPrice,
              selectedOptions: serializeSelectedOptions(
                preparedItem.item.selectedOptions,
              ),
              textInputs: serializeStoredOrderTextInputs(
                preparedItem.sanitizedTextInputs,
                configurationSnapshot,
              ),
              ...(serializedDesignData !== undefined
                ? { designData: serializedDesignData }
                : {}),
              orderNotes: preparedItem.item.orderNotes || "",
            };
          }),
        },
      },
      select: {
        id: true,
        orderNumber: true,
        trackingNumber: true,
        createdAt: true,
        customerName: true,
        customerEmail: true,
        totalAmount: true,
      },
    });
    uploadedStoragePaths.length = 0;

    await addOrderActivity({
      orderId: order.id,
      adminUserId: null,
      type: "CHECKOUT_CREATED",
      message: "Neue Bestellung wurde ueber den Checkout angelegt.",
    });

    await sendCheckoutOrderConfirmationEmail({
      orderId: order.id,
      orderNumber: String(order.orderNumber),
      publicOrderCode: order.trackingNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail ?? "",
      createdAt: order.createdAt,
      totalGross: order.totalAmount,
      items: preparedItems.map((preparedItem) => ({
        ...preparedItem.item,
        totalPrice: preparedItem.totalPrice,
      })),
    });

    return {
      ok: true,
      orderId: order.id,
      orderNumber: String(order.orderNumber),
      publicOrderCode: order.trackingNumber ?? String(order.orderNumber),
    };
  } catch (error) {
    if (uploadedStoragePaths.length > 0) {
      try {
        await deleteFilesFromSupabaseStorage(uploadedStoragePaths);
      } catch (cleanupError) {
        console.error("Supabase Storage cleanup failed:", cleanupError);
      }
    }

    console.error("Order Error:", error);

    if (error instanceof CheckoutUploadError) {
      return {
        ok: false,
        error: error.message,
      };
    }

    return {
      ok: false,
      error:
        "Die Bestellung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    };
  }
}

export async function createManualOrder(formData: FormData): Promise<void> {
  const currentUser = await requireAdminPermission("canCreateManualOrders");
  const payload = parseManualOrderPayload(getFormString(formData, "payload"));

  if (!payload || payload.items.length === 0) {
    redirect("/admin/orders/new?error=invalid");
  }

  if (payload.customerMode === "existing" && !payload.customerId.trim()) {
    redirect("/admin/orders/new?error=customer");
  }

  if (payload.customerMode === "quick" && !payload.quickCustomer.name.trim()) {
    redirect("/admin/orders/new?error=customer");
  }

  const customer =
    payload.customerMode === "existing"
      ? await prisma.customer.findUnique({
          where: { id: payload.customerId },
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            phone: true,
          },
        })
      : await createOrLinkCustomer({
          name: payload.quickCustomer.name,
          companyName: payload.quickCustomer.companyName,
          email: payload.quickCustomer.email,
          phone: payload.quickCustomer.phone,
          address: payload.quickCustomer.address,
          city: payload.quickCustomer.city,
          postalCode: payload.quickCustomer.postalCode,
          country: payload.quickCustomer.country,
          taxId: payload.quickCustomer.taxId,
          notes: payload.quickCustomer.notes,
        });

  if (!customer) {
    redirect("/admin/orders/new?error=customer");
  }

  const uniqueServiceIds = Array.from(
    new Set(payload.items.map((item) => item.serviceId)),
  );
  const services = await prisma.service.findMany({
    where: {
      id: { in: uniqueServiceIds },
      isActive: true,
    },
    include: {
      options: {
        include: {
          values: true,
        },
      },
    },
  });
  const serviceMap = new Map(
    services.map((service) => [
      service.id,
      {
        service,
        config: normalizeServiceConfiguration(service),
      },
    ]),
  );

  if (serviceMap.size !== uniqueServiceIds.length) {
    redirect("/admin/orders/new?error=service");
  }

  const builtItems = payload.items.map((item) => {
    const serviceEntry = serviceMap.get(item.serviceId);

    if (!serviceEntry) {
      redirect("/admin/orders/new?error=service");
    }

    return buildManualOrderItem({
      service: {
        id: serviceEntry.service.id,
        name: serviceEntry.service.name,
        basePrice: serviceEntry.service.basePrice,
      },
      config: serviceEntry.config,
      item,
    });
  });

  const subtotalNet = builtItems.reduce(
    (sum, item) => sum + normalizeMoneyValue(item.price),
    0,
  );
  const canApplyDiscounts = hasAdminPermission(currentUser, "canApplyDiscounts");
  const canEditFinancials = hasAdminPermission(currentUser, "canEditFinancials");
  const orderFinancials = buildOrderFinancialUpdateData({
    subtotalNet,
    discountType: canApplyDiscounts ? payload.discountType : "NONE",
    discountValue: canApplyDiscounts ? payload.discountValue : 0,
    taxRate: canEditFinancials ? payload.taxRate : DEFAULT_GERMAN_TAX_RATE,
    paymentStatus: canEditFinancials ? payload.paymentStatus : "UNPAID",
    paidAmount: canEditFinancials ? payload.paidAmount : 0,
    paymentMethod: canEditFinancials ? payload.paymentMethod : "",
    paymentNotes: canEditFinancials ? payload.paymentNotes : "",
    documentType: canEditFinancials ? payload.documentType : "ORDER",
    invoiceNumber: canEditFinancials ? payload.invoiceNumber : "",
    invoiceDate: canEditFinancials ? payload.invoiceDate : "",
    dueDate: canEditFinancials ? payload.dueDate : "",
    internalNotes: payload.internalNotes,
    customerNotes: payload.customerNotes,
  });
  const canAssignOrders = hasAdminPermission(currentUser, "canAssignOrders");
  const requestedAssigneeId = canAssignOrders
    ? normalizeOptionalString(payload.assignedToId)
    : currentUser.id;
  const assignee = requestedAssigneeId
    ? await prisma.adminUser.findFirst({
        where: { id: requestedAssigneeId, isActive: true },
        select: { id: true, name: true },
      })
    : null;

  if (requestedAssigneeId && !assignee) {
    redirect("/admin/orders/new?error=assignee");
  }

  const nextOrderNumber = await getNextOrderNumber();
  const publicOrderCode = await createUniqueOrderCode(prisma);
  const order = await prisma.order.create({
    data: {
      orderNumber: nextOrderNumber,
      trackingNumber: publicOrderCode,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      totalAmount: orderFinancials.financials.totalGross,
      status: "PAID",
      assignedToId: assignee?.id ?? null,
      assignedAt: assignee ? new Date() : null,
      internalNotes: orderFinancials.internalNotes,
      customerNotes: orderFinancials.customerNotes,
      subtotalNet: orderFinancials.financials.subtotalNet,
      discountType: orderFinancials.financials.discountType,
      discountValue: orderFinancials.financials.discountValue,
      discountAmount: orderFinancials.financials.discountAmount,
      taxRate: orderFinancials.financials.taxRate,
      taxAmount: orderFinancials.financials.taxAmount,
      totalNet: orderFinancials.financials.totalNet,
      totalGross: orderFinancials.financials.totalGross,
      currency: orderFinancials.financials.currency,
      paymentStatus: orderFinancials.paymentStatus,
      paidAmount: orderFinancials.paidAmount,
      paymentMethod: orderFinancials.paymentMethod,
      paymentNotes: orderFinancials.paymentNotes,
      documentType: orderFinancials.documentType,
      invoiceNumber: orderFinancials.invoiceNumber,
      invoiceDate: orderFinancials.invoiceDate,
      dueDate: orderFinancials.dueDate,
      items: {
        create: builtItems.map((item) => ({
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          price: item.price,
          selectedOptions: serializeSelectedOptions(item.selectedOptions),
          textInputs: serializeStoredOrderTextInputs(
            item.textInputs,
            item.configurationSnapshot,
          ),
          orderNotes: item.orderNotes ?? "",
        })),
      },
    },
    select: { id: true },
  });

  await addOrderActivity({
    orderId: order.id,
    adminUserId: currentUser.id,
    type: "MANUAL_ORDER_CREATED",
    message: assignee
      ? `${currentUser.name} hat den Auftrag manuell erstellt und ${assignee.name} zugewiesen.`
      : `${currentUser.name} hat den Auftrag manuell erstellt.`,
  });

  revalidateOrderAdminViews(order.id);
  revalidatePath("/admin/customers");
  redirect(`/admin/orders/${order.id}?created=1`);
}

export async function updateOrderStatus(formData: FormData) {
  const currentUser = await requireAdminUser();
  const orderId = getFormString(formData, "orderId");
  const status = normalizeOrderStatus(getFormString(formData, "status"));
  const internalStatus = normalizeInternalStatus(
    getFormString(formData, "internalStatus"),
  );
  const priority = normalizePriority(getFormString(formData, "priority"));
  const trackingNumber = getFormString(formData, "trackingNumber");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      internalStatus: true,
      priority: true,
      assignedToId: true,
      isArchived: true,
    },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  if (!canUpdateOrder(currentUser, order)) {
    redirect(`/admin/orders/${orderId}?forbidden=1`);
  }

  if (order.isArchived) {
    redirect(`/admin/orders/${orderId}?archived=1`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      internalStatus,
      priority,
      trackingNumber: trackingNumber || null,
    },
  });

  await addOrderActivity({
    orderId,
    adminUserId: currentUser.id,
    type: "STATUS_UPDATED",
    message: `Status: ${order.status} -> ${status}; intern: ${order.internalStatus} -> ${internalStatus}; Prioritaet: ${order.priority} -> ${priority}`,
  });

  revalidateOrderAdminViews(orderId);
}

export async function updateOrderFinancials(formData: FormData): Promise<void> {
  const currentUser = await requireAdminUser();
  const orderId = getFormString(formData, "orderId");

  if (!hasAdminPermission(currentUser, "canEditFinancials")) {
    redirect(`/admin/orders/${orderId}?forbidden=1`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      items: {
        select: {
          price: true,
        },
      },
      totalAmount: true,
      discountType: true,
      discountValue: true,
      taxRate: true,
      paymentStatus: true,
      documentType: true,
      isArchived: true,
    },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  if (order.isArchived) {
    redirect(`/admin/orders/${orderId}?archived=1`);
  }

  const subtotalNet =
    order.items.length > 0
      ? order.items.reduce(
          (sum, item) => sum + normalizeMoneyValue(item.price),
          0,
        )
      : normalizeMoneyValue(order.totalAmount);
  const nextFinancialData = buildOrderFinancialUpdateData({
    subtotalNet,
    discountType: getFormString(formData, "discountType"),
    discountValue: Number.parseFloat(getFormString(formData, "discountValue")) || 0,
    taxRate:
      Number.parseFloat(getFormString(formData, "taxRate")) ||
      DEFAULT_GERMAN_TAX_RATE,
    paymentStatus: getFormString(formData, "paymentStatus"),
    paidAmount: Number.parseFloat(getFormString(formData, "paidAmount")) || 0,
    paymentMethod: getFormString(formData, "paymentMethod"),
    paymentNotes: getFormString(formData, "paymentNotes"),
    documentType: getFormString(formData, "documentType"),
    invoiceNumber: getFormString(formData, "invoiceNumber"),
    invoiceDate: getFormString(formData, "invoiceDate"),
    dueDate: getFormString(formData, "dueDate"),
    internalNotes: getFormString(formData, "internalNotes"),
    customerNotes: getFormString(formData, "customerNotes"),
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      totalAmount: nextFinancialData.financials.totalGross,
      internalNotes: nextFinancialData.internalNotes,
      customerNotes: nextFinancialData.customerNotes,
      subtotalNet: nextFinancialData.financials.subtotalNet,
      discountType: nextFinancialData.financials.discountType,
      discountValue: nextFinancialData.financials.discountValue,
      discountAmount: nextFinancialData.financials.discountAmount,
      taxRate: nextFinancialData.financials.taxRate,
      taxAmount: nextFinancialData.financials.taxAmount,
      totalNet: nextFinancialData.financials.totalNet,
      totalGross: nextFinancialData.financials.totalGross,
      currency: nextFinancialData.financials.currency,
      paymentStatus: nextFinancialData.paymentStatus,
      paidAmount: nextFinancialData.paidAmount,
      paymentMethod: nextFinancialData.paymentMethod,
      paymentNotes: nextFinancialData.paymentNotes,
      documentType: nextFinancialData.documentType,
      invoiceNumber: nextFinancialData.invoiceNumber,
      invoiceDate: nextFinancialData.invoiceDate,
      dueDate: nextFinancialData.dueDate,
    },
  });

  await addOrderActivity({
    orderId,
    adminUserId: currentUser.id,
    type: "FINANCIALS_UPDATED",
    message: `Finanzen aktualisiert: Rabatt ${order.discountType ?? "NONE"} -> ${nextFinancialData.financials.discountType}, MwSt ${normalizeMoneyValue(order.taxRate ?? 0).toFixed(2)}% -> ${nextFinancialData.financials.taxRate.toFixed(2)}%, Zahlung ${getOrderPaymentStatus(order)} -> ${nextFinancialData.paymentStatus}, Dokument ${order.documentType ?? "ORDER"} -> ${nextFinancialData.documentType}.`,
  });

  revalidateOrderAdminViews(orderId);
}

export async function archiveOrder(formData: FormData): Promise<void> {
  const currentUser = await requireAdminUser();
  const orderId = getFormString(formData, "orderId");

  if (!hasAdminPermission(currentUser, "canArchiveOrders")) {
    redirect(`/admin/orders/${orderId}?forbidden=1`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      internalStatus: true,
      isArchived: true,
    },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  if (!canArchiveOrderRecord(order)) {
    redirect(`/admin/orders/${orderId}?archiveError=1`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archivedById: currentUser.id,
    },
  });

  await addOrderActivity({
    orderId,
    adminUserId: currentUser.id,
    type: "ARCHIVED",
    message: `${currentUser.name} hat den Auftrag archiviert.`,
  });

  revalidateOrderAdminViews(orderId);
  redirect(`/admin/orders/${orderId}?archived=1`);
}

export async function restoreArchivedOrder(formData: FormData): Promise<void> {
  const currentUser = await requireAdminUser();
  const orderId = getFormString(formData, "orderId");

  if (!isSuperAdmin(currentUser)) {
    redirect(`/admin/orders/${orderId}?forbidden=1`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      isArchived: true,
    },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  if (!order.isArchived) {
    redirect(`/admin/orders/${orderId}`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      isArchived: false,
      archivedAt: null,
      archivedById: null,
    },
  });

  await addOrderActivity({
    orderId,
    adminUserId: currentUser.id,
    type: "RESTORED",
    message: `${currentUser.name} hat den Auftrag aus dem Archiv wiederhergestellt.`,
  });

  revalidateOrderAdminViews(orderId);
  redirect(`/admin/orders/${orderId}?restored=1`);
}

export async function claimOrder(formData: FormData): Promise<void> {
  const currentUser = await requireAdminPermission("canClaimOrders");
  const orderId = getFormString(formData, "orderId");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, assignedToId: true, isArchived: true },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  if (order.assignedToId && order.assignedToId !== currentUser.id) {
    redirect(`/admin/orders/${orderId}?assigned=1`);
  }

  if (order.isArchived) {
    redirect(`/admin/orders/${orderId}?archived=1`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      assignedToId: currentUser.id,
      assignedAt: new Date(),
    },
  });

  await addOrderActivity({
    orderId,
    adminUserId: currentUser.id,
    type: "CLAIMED",
    message: `${currentUser.name} hat den Auftrag uebernommen.`,
  });

  revalidateOrderAdminViews(orderId);
}

export async function assignOrder(formData: FormData): Promise<void> {
  const currentUser = await requireAdminPermission("canAssignOrders");
  const orderId = getFormString(formData, "orderId");
  const assignedToId = getFormString(formData, "assignedToId");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, isArchived: true },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  const assignee = assignedToId
    ? await prisma.adminUser.findFirst({
        where: { id: assignedToId, isActive: true },
        select: { id: true, name: true },
      })
    : null;

  if (assignedToId && !assignee) {
    redirect(`/admin/orders/${orderId}?assignError=1`);
  }

  if (order.isArchived) {
    redirect(`/admin/orders/${orderId}?archived=1`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      assignedToId: assignee?.id ?? null,
      assignedAt: assignee ? new Date() : null,
    },
  });

  await addOrderActivity({
    orderId,
    adminUserId: currentUser.id,
    type: "ASSIGNED",
    message: assignee
      ? `${currentUser.name} hat den Auftrag ${assignee.name} zugewiesen.`
      : `${currentUser.name} hat die Zuweisung entfernt.`,
  });

  revalidateOrderAdminViews(orderId);
}

export async function addOrderInternalNote(formData: FormData): Promise<void> {
  const currentUser = await requireAdminUser();
  const orderId = getFormString(formData, "orderId");
  const message = getFormString(formData, "message");

  if (!message) {
    redirect(`/admin/orders/${orderId}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, assignedToId: true, isArchived: true },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  if (
    !canUpdateOrder(currentUser, order) &&
    !hasAdminPermission(currentUser, "canAssignOrders")
  ) {
    redirect(`/admin/orders/${orderId}?forbidden=1`);
  }

  if (order.isArchived) {
    redirect(`/admin/orders/${orderId}?archived=1`);
  }

  await addOrderActivity({
    orderId,
    adminUserId: currentUser.id,
    type: "INTERNAL_NOTE",
    message,
  });

  revalidateOrderAdminViews(orderId);
}

const PUBLIC_PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Bezahlt",
  PARTIALLY_PAID: "Teilweise bezahlt",
  REFUNDED: "Erstattet",
  UNPAID: "Offen",
};

const PUBLIC_ORDER_STATUS_LABELS: Record<string, string> = {
  CANCELED: "Storniert",
  DELIVERED: "Zugestellt",
  PAID: "Eingegangen",
  PROCESSING: "In Bearbeitung",
  SHIPPED: "Versendet",
};

function getPublicOrderCode(input: {
  orderNumber: number;
  trackingNumber: string | null;
}): string {
  return input.trackingNumber?.trim() || String(input.orderNumber);
}

function getPublicOrderStatusLabel(status: string): string {
  return PUBLIC_ORDER_STATUS_LABELS[status] ?? "In Bearbeitung";
}

function getPublicOrderNextStep(status: string): string {
  switch (status) {
    case "PAID":
      return "Wir haben Ihren Auftrag erhalten und pruefen die weiteren Schritte.";
    case "PROCESSING":
      return "Ihr Auftrag befindet sich aktuell in der Bearbeitung oder Produktion.";
    case "SHIPPED":
      return "Ihr Auftrag ist unterwegs. Bitte pruefen Sie den Zustellstatus regelmaessig.";
    case "DELIVERED":
      return "Ihr Auftrag wurde zugestellt.";
    case "CANCELED":
      return "Dieser Auftrag wurde storniert. Bei Rueckfragen helfen wir Ihnen gern weiter.";
    default:
      return "Ihr Auftrag wird aktuell bearbeitet.";
  }
}

function getCustomerSafePaymentStatusLabel(
  paymentStatus: string | null | undefined,
): string | null {
  if (!paymentStatus?.trim()) {
    return null;
  }

  return PUBLIC_PAYMENT_STATUS_LABELS[normalizePaymentStatus(paymentStatus)] ?? null;
}

function buildCustomerOrderEmailWhere(email: string): Prisma.OrderWhereInput {
  return {
    OR: [
      {
        customerEmail: {
          equals: email,
          mode: "insensitive",
        },
      },
      {
        customer: {
          is: {
            email,
          },
        },
      },
    ],
  };
}

function buildCustomerOrderLookupWhere(lookup: string): Prisma.OrderWhereInput {
  const normalizedLookup = normalizePublicOrderLookup(lookup);

  if (isLegacyNumericOrderLookup(normalizedLookup)) {
    return {
      OR: [
        { orderNumber: Number.parseInt(normalizedLookup, 10) },
        {
          trackingNumber: {
            equals: normalizedLookup,
            mode: "insensitive",
          },
        },
      ],
    };
  }

  return {
    trackingNumber: {
      equals: normalizedLookup,
      mode: "insensitive",
    },
  };
}

function buildCustomerDocumentLinks(order: {
  documentType: string | null;
  id: string;
}): CustomerOrderDocumentLink[] {
  const documentType = normalizeOrderDocumentQueryType(null, order.documentType);
  const documentLabel =
    documentType === "invoice"
      ? "Rechnung ansehen"
      : documentType === "offer"
        ? "Angebot ansehen"
        : "Auftragsdokument ansehen";
  const token = createOrderDocumentShareToken({
    orderId: order.id,
    type: documentType,
  });

  return [
    {
      href: buildSharedOrderDocumentHref(
        order.id,
        documentType,
        token.expires,
        token.signature,
      ),
      label: documentLabel,
    },
  ];
}

function buildCustomerOrderItemDetails(
  item: {
    designData: Prisma.JsonValue | null;
    id: string;
    itemDescription: string | null;
    orderNotes: string | null;
    price: number;
    quantity: number;
    selectedOptions: Prisma.JsonValue | null;
    serviceId: string;
    serviceName: string;
    textInputs: Prisma.JsonValue | null;
  },
): CustomerOrderDetailItem {
  const storedTextInputs = extractStoredOrderTextInputs(item.textInputs);
  const snapshot = getSnapshotOrBuildLegacy({
    serviceId: item.serviceId,
    serviceName: item.serviceName,
    basePrice: item.price,
    totalPrice: item.price,
    quantity: item.quantity,
    selectedOptions: normalizeLegacySelectedOptions(item.selectedOptions),
    textInputs: storedTextInputs.textInputs,
    designData: item.designData,
    orderNotes: item.orderNotes,
    configurationSnapshot: storedTextInputs.configurationSnapshot,
  });
  const optionLines = [
    ...snapshot.selectedOptions.map(
      (option) => `${option.fieldLabel}: ${option.valueLabel}`,
    ),
    ...snapshot.textFields.map((field) => `${field.fieldLabel}: ${field.value}`),
    ...(snapshot.size
      ? [`${snapshot.size.fieldLabel}: ${snapshot.size.value}`]
      : []),
    ...(snapshot.color
      ? [`${snapshot.color.fieldLabel}: ${snapshot.color.value}`]
      : []),
  ].slice(0, 8);
  const fileNames = getSnapshotUploadFileRecords(snapshot)
    .map((file) => file.originalName.trim())
    .filter((fileName) => fileName !== "");
  const notes =
    snapshot.orderNotes?.trim() ||
    item.itemDescription?.trim() ||
    normalizeOptionalString(item.orderNotes);

  return {
    fileNames,
    id: item.id,
    itemTotal: normalizeMoneyValue(item.price),
    notes,
    optionLines,
    quantity: item.quantity,
    serviceName: item.serviceName,
  };
}

function buildCustomerOrderSummary(order: {
  _count: { items: number };
  createdAt: Date;
  orderNumber: number;
  status: string;
  totalAmount: number;
  trackingNumber: string | null;
}): CustomerOrderSummary {
  return {
    createdAt: order.createdAt.toISOString(),
    itemCount: order._count.items,
    legacyOrderNumber: String(order.orderNumber),
    publicOrderCode: getPublicOrderCode(order),
    status: order.status,
    statusLabel: getPublicOrderStatusLabel(order.status),
    totalAmount: normalizeMoneyValue(order.totalAmount),
  };
}

function buildCustomerOrderDetail(order: {
  createdAt: Date;
  customerNotes: string | null;
  documentType: string | null;
  id: string;
  items: Array<{
    designData: Prisma.JsonValue | null;
    id: string;
    itemDescription: string | null;
    orderNotes: string | null;
    price: number;
    quantity: number;
    selectedOptions: Prisma.JsonValue | null;
    serviceId: string;
    serviceName: string;
    textInputs: Prisma.JsonValue | null;
  }>;
  orderNumber: number;
  paymentStatus: string | null;
  status: string;
  totalAmount: number;
  totalGross: number | null;
  trackingNumber: string | null;
}): CustomerOrderDetail {
  return {
    createdAt: order.createdAt.toISOString(),
    customerNotes: normalizeOptionalString(order.customerNotes),
    documentLinks: buildCustomerDocumentLinks(order),
    items: order.items.map((item) => buildCustomerOrderItemDetails(item)),
    legacyOrderNumber: String(order.orderNumber),
    nextStep: getPublicOrderNextStep(order.status),
    paymentStatusLabel: getCustomerSafePaymentStatusLabel(order.paymentStatus),
    publicOrderCode: getPublicOrderCode(order),
    status: order.status,
    statusLabel: getPublicOrderStatusLabel(order.status),
    totalAmount: normalizeMoneyValue(order.totalGross ?? order.totalAmount),
  };
}

export async function findCustomerOrdersByEmail(
  email: string,
): Promise<CustomerOrderSummary[]> {
  const normalizedEmail = normalizeCustomerEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  const orders = await prisma.order.findMany({
    where: buildCustomerOrderEmailWhere(normalizedEmail),
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      orderNumber: true,
      trackingNumber: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return orders.map((order) => buildCustomerOrderSummary(order));
}

export async function findCustomerOrderDetails(input: {
  email: string;
  lookup: string;
}): Promise<CustomerOrderDetail | null> {
  const normalizedEmail = normalizeCustomerEmail(input.email);
  const normalizedLookup = normalizePublicOrderLookup(input.lookup);

  if (!normalizedEmail || !normalizedLookup) {
    return null;
  }

  const order = await prisma.order.findFirst({
    where: {
      AND: [
        buildCustomerOrderEmailWhere(normalizedEmail),
        buildCustomerOrderLookupWhere(normalizedLookup),
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      trackingNumber: true,
      totalAmount: true,
      totalGross: true,
      status: true,
      paymentStatus: true,
      customerNotes: true,
      documentType: true,
      createdAt: true,
      items: {
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          serviceId: true,
          serviceName: true,
          quantity: true,
          price: true,
          itemDescription: true,
          selectedOptions: true,
          textInputs: true,
          designData: true,
          orderNotes: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  return buildCustomerOrderDetail(order);
}
