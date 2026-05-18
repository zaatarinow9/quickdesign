"use server"

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/lib/store/cart";
import { revalidatePath } from "next/cache";
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

export async function createOrder(data: {
  customerName: string;
  customerEmail: string;
  items: CartItem[];
  totalAmount: number;
}) {
  try {
    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' }
    });
    const nextOrderNumber = lastOrder?.orderNumber ? lastOrder.orderNumber + 1 : 10000;

    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        totalAmount: data.totalAmount,
        status: "PAID", 
        items: {
          create: data.items.map((item) => {
            const configurationSnapshot = getSnapshotOrBuildLegacy({
              serviceId: item.serviceId,
              serviceName: item.name,
              basePrice: item.basePrice,
              totalPrice: item.totalPrice,
              quantity: item.quantity,
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
              quantity: item.quantity,
              price: item.totalPrice,
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

    return { success: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (error) {
    console.error("Order Error:", error);
    return { success: false, error: "Fehler beim Speichern der Bestellung" };
  }
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = formData.get("orderId") as string;
  const status = formData.get("status") as string;
  const trackingNumber = formData.get("trackingNumber");
  const normalizedTrackingNumber =
    typeof trackingNumber === "string" && trackingNumber.trim() !== ""
      ? trackingNumber.trim()
      : null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      trackingNumber: normalizedTrackingNumber,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/admin/orders`);
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
