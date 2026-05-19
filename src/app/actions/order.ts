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
import { createOrLinkCustomer } from "@/lib/customers";
import {
  DEFAULT_GERMAN_TAX_RATE,
  DEFAULT_ORDER_CURRENCY,
  calculateOrderFinancials,
  getOrderPaymentStatus,
  normalizeDocumentType,
  normalizeNonNegativeNumber as normalizeMoneyValue,
  normalizePaymentStatus,
} from "@/lib/orders/finance";
import {
  buildManualOrderItem,
  parseManualOrderPayload,
} from "@/lib/orders/manual";
import { canArchiveOrder as canArchiveOrderRecord } from "@/lib/orders/reporting";
import type { CartItem } from "@/lib/store/cart";
import { normalizeServiceConfiguration } from "@/lib/services/configuration/normalize";
import {
  getSnapshotOrBuildLegacy,
  wrapOrderTextInputsWithSnapshot,
  type LegacyConfigurationSelectedOptions,
  type LegacyConfigurationTextInputs,
  type ServiceConfigurationSnapshot,
} from "@/lib/services/configuration/snapshot";

type TrackableOrderRow = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string | null;
  totalAmount: number;
  status: string;
  trackingNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

type CreateOrderInput = {
  customerName: string;
  customerEmail: string;
  items: CartItem[];
  totalAmount: number;
};

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
        customerLabel: file.customerLabel,
        fileType: file.fileType,
        fileSize: file.fileSize,
        fileUrl: file.fileUrl,
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

export async function createOrder(data: CreateOrderInput): Promise<CreateOrderResult> {
  try {
    const customerName = normalizeCheckoutString(data.customerName);
    const customerEmail = normalizeCheckoutString(data.customerEmail);

    if (!customerName || !customerEmail) {
      return {
        ok: false,
        error: "Bitte geben Sie Name und E-Mail-Adresse ein.",
      };
    }

    if (data.items.length === 0) {
      return {
        ok: false,
        error: "Ihr Warenkorb ist leer.",
      };
    }

    const totalAmount = normalizeMoneyValue(
      data.totalAmount,
      data.items.reduce(
        (sum, item) => sum + normalizeMoneyValue(item.totalPrice),
        0,
      ),
    );
    const customer = await createOrLinkCustomer({
      name: customerName,
      email: customerEmail,
    });
    const nextOrderNumber = await getNextOrderNumber();
    const financials = calculateOrderFinancials({
      subtotalNet: totalAmount,
      discountType: "NONE",
      discountValue: 0,
      taxRate: 0,
      currency: DEFAULT_ORDER_CURRENCY,
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
          create: data.items.map((item) => {
            const quantity = normalizeOrderQuantity(item.quantity);
            const totalPrice = normalizeMoneyValue(item.totalPrice);
            const configurationSnapshot = getSnapshotOrBuildLegacy({
              serviceId: item.serviceId,
              serviceName: item.name,
              basePrice: normalizeMoneyValue(item.basePrice),
              totalPrice,
              quantity,
              selectedOptions: item.selectedOptions,
              textInputs: item.textInputs,
              designData: item.designData,
              orderNotes: item.orderNotes,
              configurationSnapshot: item.configurationSnapshot,
            });
            const serializedDesignData = serializeDesignData(item.designData);

            return {
              serviceId: item.serviceId,
              serviceName: item.name,
              quantity,
              price: totalPrice,
              selectedOptions: serializeSelectedOptions(item.selectedOptions),
              textInputs: serializeStoredOrderTextInputs(
                item.textInputs,
                configurationSnapshot,
              ),
              ...(serializedDesignData !== undefined
                ? { designData: serializedDesignData }
                : {}),
              orderNotes: item.orderNotes || "",
            };
          }),
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    await addOrderActivity({
      orderId: order.id,
      adminUserId: null,
      type: "CHECKOUT_CREATED",
      message: "Neue Bestellung wurde ueber den Checkout angelegt.",
    });

    return {
      ok: true,
      orderId: order.id,
      orderNumber: String(order.orderNumber),
    };
  } catch (error) {
    console.error("Order Error:", error);
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
  const order = await prisma.order.create({
    data: {
      orderNumber: nextOrderNumber,
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

export async function trackOrder(orderNumberStr: string) {
  const orderNumber = parseInt(orderNumberStr, 10);
  if (Number.isNaN(orderNumber)) {
    return null;
  }

  const order: TrackableOrderRow | null = await prisma.order.findFirst({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      totalAmount: true,
      status: true,
      trackingNumber: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!order) {
    return null;
  }

  const items = await prisma.orderItem.findMany({
    where: { orderId: order.id },
  });

  return { ...order, items };
}
