import { calculateServicePrice } from "@/lib/services/configuration/pricing";
import {
  createConfigurationSnapshot,
  type LegacyConfigurationSelectedOptions,
  type LegacyConfigurationTextInputs,
  type ServiceConfigurationSnapshot,
  type ServiceConfigurationSnapshotSelectedOption,
  type ServiceConfigurationSnapshotTextField,
  type ServiceConfigurationSnapshotValue,
} from "@/lib/services/configuration/snapshot";
import type {
  NormalizedServiceConfig,
  NormalizedServiceField,
} from "@/lib/services/configuration/types";

export type ManualOrderItemDraft = {
  serviceId: string;
  customName: string;
  description: string;
  quantity: number;
  selectedValues: Record<string, string>;
  textFieldValues: Record<string, string>;
  selectedQuantityTierId: string;
  widthCm: string;
  heightCm: string;
  manualPriceOverride: string;
  orderNotes: string;
};

export type ManualOrderQuickCustomer = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  taxId: string;
  notes: string;
};

export type ManualOrderPayload = {
  customerMode: "existing" | "quick";
  customerId: string;
  quickCustomer: ManualOrderQuickCustomer;
  items: ManualOrderItemDraft[];
  internalNotes: string;
  customerNotes: string;
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
  assignedToId: string;
};

export type ManualOrderBuiltItem = {
  serviceId: string;
  serviceName: string;
  itemDescription: string | null;
  quantity: number;
  price: number;
  calculatedPrice: number;
  manualPriceOverride: number | null;
  selectedOptions: LegacyConfigurationSelectedOptions;
  textInputs: LegacyConfigurationTextInputs;
  configurationSnapshot: ServiceConfigurationSnapshot;
  orderNotes: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizePositiveInteger(value: unknown, fallback = 1): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value));
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) ? Math.max(1, parsedValue) : fallback;
  }

  return fallback;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number.parseFloat(normalizedValue.replace(",", "."));
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, string> = {};

  Object.entries(value).forEach(([key, entry]) => {
    if (typeof entry === "string") {
      result[key] = entry;
    }
  });

  return result;
}

function isValueField(field: NormalizedServiceField): boolean {
  return (
    field.kind === "select" || field.kind === "radio" || field.kind === "size"
  );
}

function isTextLikeField(field: NormalizedServiceField): boolean {
  return field.kind === "text" || field.kind === "number";
}

function toManualTextFieldKind(
  kind: NormalizedServiceField["kind"],
): ServiceConfigurationSnapshotTextField["kind"] | null {
  if (kind === "number") {
    return "number";
  }

  if (kind === "text") {
    return "text";
  }

  return null;
}

function formatDisplayNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function buildInitialManualOrderItem(
  serviceId: string,
  config: NormalizedServiceConfig,
): ManualOrderItemDraft {
  const selectedValues: Record<string, string> = {};

  config.fields.forEach((field) => {
    if (!isValueField(field) || field.values.length === 0) {
      return;
    }

    const defaultValueId = field.defaultValueId ?? field.values[0]?.id;
    if (defaultValueId) {
      selectedValues[field.id] = defaultValueId;
    }
  });

  return {
    serviceId,
    customName: "",
    description: "",
    quantity: 1,
    selectedValues,
    textFieldValues: {},
    selectedQuantityTierId:
      config.pricing.mode === "quantity_tiers"
        ? (config.pricing.quantityTiers[0]?.id ?? "")
        : "",
    widthCm: "",
    heightCm: "",
    manualPriceOverride: "",
    orderNotes: "",
  };
}

export function parseManualOrderPayload(rawPayload: string): ManualOrderPayload | null {
  if (!rawPayload.trim()) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawPayload);

    if (!isRecord(parsedValue)) {
      return null;
    }

    const rawItems = Array.isArray(parsedValue.items) ? parsedValue.items : [];
    const items = rawItems
      .map((item): ManualOrderItemDraft | null => {
        if (!isRecord(item)) {
          return null;
        }

        const serviceId =
          typeof item.serviceId === "string" ? item.serviceId.trim() : "";
        if (!serviceId) {
          return null;
        }

        return {
          serviceId,
          customName:
            typeof item.customName === "string" ? item.customName : "",
          description:
            typeof item.description === "string" ? item.description : "",
          quantity: normalizePositiveInteger(item.quantity, 1),
          selectedValues: normalizeStringRecord(item.selectedValues),
          textFieldValues: normalizeStringRecord(item.textFieldValues),
          selectedQuantityTierId:
            typeof item.selectedQuantityTierId === "string"
              ? item.selectedQuantityTierId
              : "",
          widthCm: typeof item.widthCm === "string" ? item.widthCm : "",
          heightCm: typeof item.heightCm === "string" ? item.heightCm : "",
          manualPriceOverride:
            typeof item.manualPriceOverride === "string"
              ? item.manualPriceOverride
              : "",
          orderNotes: typeof item.orderNotes === "string" ? item.orderNotes : "",
        };
      })
      .filter((item): item is ManualOrderItemDraft => item !== null);

    const quickCustomerSource = isRecord(parsedValue.quickCustomer)
      ? parsedValue.quickCustomer
      : {};

    return {
      customerMode:
        parsedValue.customerMode === "quick" ? "quick" : "existing",
      customerId:
        typeof parsedValue.customerId === "string" ? parsedValue.customerId : "",
      quickCustomer: {
        name:
          typeof quickCustomerSource.name === "string"
            ? quickCustomerSource.name
            : "",
        companyName:
          typeof quickCustomerSource.companyName === "string"
            ? quickCustomerSource.companyName
            : "",
        email:
          typeof quickCustomerSource.email === "string"
            ? quickCustomerSource.email
            : "",
        phone:
          typeof quickCustomerSource.phone === "string"
            ? quickCustomerSource.phone
            : "",
        address:
          typeof quickCustomerSource.address === "string"
            ? quickCustomerSource.address
            : "",
        city:
          typeof quickCustomerSource.city === "string"
            ? quickCustomerSource.city
            : "",
        postalCode:
          typeof quickCustomerSource.postalCode === "string"
            ? quickCustomerSource.postalCode
            : "",
        country:
          typeof quickCustomerSource.country === "string"
            ? quickCustomerSource.country
            : "",
        taxId:
          typeof quickCustomerSource.taxId === "string"
            ? quickCustomerSource.taxId
            : "",
        notes:
          typeof quickCustomerSource.notes === "string"
            ? quickCustomerSource.notes
            : "",
      },
      items,
      internalNotes:
        typeof parsedValue.internalNotes === "string"
          ? parsedValue.internalNotes
          : "",
      customerNotes:
        typeof parsedValue.customerNotes === "string"
          ? parsedValue.customerNotes
          : "",
      discountType:
        typeof parsedValue.discountType === "string"
          ? parsedValue.discountType
          : "NONE",
      discountValue: normalizeOptionalNumber(parsedValue.discountValue) ?? 0,
      taxRate: normalizeOptionalNumber(parsedValue.taxRate) ?? 0,
      paymentStatus:
        typeof parsedValue.paymentStatus === "string"
          ? parsedValue.paymentStatus
          : "UNPAID",
      paidAmount: normalizeOptionalNumber(parsedValue.paidAmount),
      paymentMethod:
        typeof parsedValue.paymentMethod === "string"
          ? parsedValue.paymentMethod
          : "",
      paymentNotes:
        typeof parsedValue.paymentNotes === "string"
          ? parsedValue.paymentNotes
          : "",
      documentType:
        typeof parsedValue.documentType === "string"
          ? parsedValue.documentType
          : "ORDER",
      invoiceNumber:
        typeof parsedValue.invoiceNumber === "string"
          ? parsedValue.invoiceNumber
          : "",
      invoiceDate:
        typeof parsedValue.invoiceDate === "string"
          ? parsedValue.invoiceDate
          : "",
      dueDate:
        typeof parsedValue.dueDate === "string" ? parsedValue.dueDate : "",
      assignedToId:
        typeof parsedValue.assignedToId === "string"
          ? parsedValue.assignedToId
          : "",
    };
  } catch {
    return null;
  }
}

export function buildManualOrderItem(input: {
  service: {
    id: string;
    name: string;
    basePrice: number;
  };
  config: NormalizedServiceConfig;
  item: ManualOrderItemDraft;
}): ManualOrderBuiltItem {
  const quantity = normalizePositiveInteger(input.item.quantity, 1);
  const selectedValues = input.item.selectedValues ?? {};
  const textInputs: LegacyConfigurationTextInputs = {};
  const selectedOptions: LegacyConfigurationSelectedOptions = {};
  const snapshotSelectedOptions: ServiceConfigurationSnapshotSelectedOption[] = [];
  const snapshotTextFields: ServiceConfigurationSnapshotTextField[] = [];
  let snapshotSize: ServiceConfigurationSnapshotValue | null = null;

  const priceResult = calculateServicePrice({
    config: input.config,
    selectedValues,
    quantity,
    selectedQuantityTierId:
      normalizeOptionalString(input.item.selectedQuantityTierId) || null,
    area: {
      widthCm: normalizeOptionalString(input.item.widthCm),
      heightCm: normalizeOptionalString(input.item.heightCm),
    },
  });

  input.config.fields.forEach((field) => {
    if (isValueField(field)) {
      const selectedValueId = selectedValues[field.id];
      const selectedValue = field.values.find((value) => value.id === selectedValueId);

      if (!selectedValue) {
        return;
      }

      if (field.kind === "size") {
        textInputs[field.key] = {
          optionName: field.label,
          value: selectedValue.label,
        };

        snapshotSize = {
          fieldKey: field.key,
          fieldLabel: field.label,
          value: selectedValue.label,
        };
        return;
      }

      if (field.source === "option") {
        const optionKey = field.sourceOptionId ?? field.id;

        selectedOptions[optionKey] = {
          optionName: field.label,
          valueName: selectedValue.label,
          price: selectedValue.price,
        };
      }

      snapshotSelectedOptions.push({
        fieldKey: field.key,
        fieldLabel: field.label,
        valueKey: selectedValue.id,
        valueLabel: selectedValue.label,
        priceImpact: selectedValue.price,
      });
      return;
    }

    if (isTextLikeField(field)) {
      const snapshotKind = toManualTextFieldKind(field.kind);
      const value = normalizeOptionalString(input.item.textFieldValues[field.id]);
      if (!snapshotKind || !value) {
        return;
      }

      textInputs[field.key] = {
        optionName: field.label,
        value,
      };
      snapshotTextFields.push({
        fieldKey: field.key,
        fieldLabel: field.label,
        value,
        kind: snapshotKind,
      });
    }
  });

  const selectedTier =
    input.config.pricing.mode === "quantity_tiers"
      ? input.config.pricing.quantityTiers.find(
          (tier) => tier.id === priceResult.selectedTierId,
        ) ?? null
      : null;

  if (input.config.pricing.mode === "quantity_tiers" && selectedTier) {
    textInputs.pricing_model = {
      optionName: "Preismodell",
      value: "Mengenstaffel",
    };
    textInputs.pricing_tier = {
      optionName: "Mengenstaffel",
      value: selectedTier.label,
    };
  }

  if (input.config.pricing.mode === "area" && input.config.pricing.area) {
    textInputs.pricing_model = {
      optionName: "Preismodell",
      value: "Flächenpreis",
    };
    textInputs.pricing_width_cm = {
      optionName: input.config.pricing.area.widthLabel,
      value: `${formatDisplayNumber(priceResult.widthCm)} cm`,
    };
    textInputs.pricing_height_cm = {
      optionName: input.config.pricing.area.heightLabel,
      value: `${formatDisplayNumber(priceResult.heightCm)} cm`,
    };
    textInputs.pricing_area_sqm = {
      optionName: "Fläche",
      value: `${priceResult.billableAreaSqm.toFixed(3)} m2`,
    };
  }

  const manualPriceOverride = normalizeOptionalNumber(input.item.manualPriceOverride);
  const finalPrice = Math.max(0, manualPriceOverride ?? priceResult.total);
  const serviceName =
    normalizeOptionalString(input.item.customName) || input.service.name;
  const orderNotes = normalizeOptionalString(input.item.orderNotes);
  const itemDescription = normalizeOptionalString(input.item.description) || null;

  const configurationSnapshot = createConfigurationSnapshot({
    serviceId: input.service.id,
    serviceName,
    pricingModel: input.config.pricing.mode,
    calculatedPrice: {
      currency: "EUR",
      total: finalPrice,
      basePrice: priceResult.basePrice,
      baseUnitPrice:
        manualPriceOverride !== null
          ? Math.max(0, finalPrice / quantity)
          : priceResult.baseUnitPrice,
      optionPriceImpact: priceResult.optionPriceImpact,
      quantity,
    },
    quantity,
    selectedOptions: snapshotSelectedOptions,
    selectedPricingTier: selectedTier
      ? {
          id: selectedTier.id,
          label: selectedTier.label,
          quantity: selectedTier.quantity,
          price: selectedTier.price,
        }
      : null,
    area:
      input.config.pricing.mode === "area" && input.config.pricing.area
        ? {
            widthCm: priceResult.widthCm,
            heightCm: priceResult.heightCm,
            areaSqm: priceResult.billableAreaSqm,
            pricePerSqm: priceResult.pricePerSqm,
          }
        : null,
    uploadFields: [],
    textFields: snapshotTextFields,
    size: snapshotSize,
    color: null,
    design: null,
    customerNotes: orderNotes || null,
    orderNotes: orderNotes || null,
    customQuote: priceResult.isQuoteOnly,
  });

  return {
    serviceId: input.service.id,
    serviceName,
    itemDescription,
    quantity,
    price: finalPrice,
    calculatedPrice: priceResult.total,
    manualPriceOverride,
    selectedOptions,
    textInputs,
    configurationSnapshot,
    orderNotes: orderNotes || null,
  };
}
