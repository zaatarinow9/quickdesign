"use server"

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/lib/store/cart";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission, requireAdminUser } from "@/lib/admin/auth";
import { canUpdateOrder, hasAdminPermission } from "@/lib/admin/permissions";
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
  customerEmail: string;
  totalAmount: number;
  status: string;
  trackingNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MutableJsonObject = Record<string, Prisma.InputJsonValue>;

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

function normalizeNonNegativeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : fallback;
}

function normalizeOrderQuantity(value: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.trunc(value))
    : 1;
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
) : Prisma.InputJsonValue | undefined {
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

    const totalAmount = normalizeNonNegativeNumber(
      data.totalAmount,
      data.items.reduce(
        (sum, item) => sum + normalizeNonNegativeNumber(item.totalPrice),
        0,
      ),
    );

    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' }
    });
    const nextOrderNumber = lastOrder?.orderNumber ? lastOrder.orderNumber + 1 : 10000;

    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber,
        customerName,
        customerEmail,
        totalAmount,
        status: "PAID", 
        items: {
          create: data.items.map((item) => {
            const quantity = normalizeOrderQuantity(item.quantity);
            const totalPrice = normalizeNonNegativeNumber(item.totalPrice);
            const configurationSnapshot = getSnapshotOrBuildLegacy({
              serviceId: item.serviceId,
              serviceName: item.name,
              basePrice: normalizeNonNegativeNumber(item.basePrice),
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
      error: "Die Bestellung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    };
  }
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
    },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  if (!canUpdateOrder(currentUser, order)) {
    redirect(`/admin/orders/${orderId}?forbidden=1`);
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

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/admin/orders`);
}

export async function claimOrder(formData: FormData): Promise<void> {
  const currentUser = await requireAdminPermission("canClaimOrders");
  const orderId = getFormString(formData, "orderId");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, assignedToId: true },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  if (order.assignedToId && order.assignedToId !== currentUser.id) {
    redirect(`/admin/orders/${orderId}?assigned=1`);
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

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function assignOrder(formData: FormData): Promise<void> {
  const currentUser = await requireAdminPermission("canAssignOrders");
  const orderId = getFormString(formData, "orderId");
  const assignedToId = getFormString(formData, "assignedToId");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
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

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
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
    select: { id: true, assignedToId: true },
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

  await addOrderActivity({
    orderId,
    adminUserId: currentUser.id,
    type: "INTERNAL_NOTE",
    message,
  });

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function trackOrder(orderNumberStr: string) {
  const orderNumber = parseInt(orderNumberStr, 10);
  if (Number.isNaN(orderNumber)) return null;

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
  if (!order) return null;

  const items = await prisma.orderItem.findMany({
    where: { orderId: order.id },
  });

  return { ...order, items };
}
