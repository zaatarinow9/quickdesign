import type { NormalizedServicePricingMode } from "./types";

export type LegacyConfigurationSelectedOption = {
  optionName: string;
  valueName: string;
  price: number;
};

export type LegacyConfigurationSelectedOptions = Record<
  string,
  LegacyConfigurationSelectedOption
>;

export type LegacyConfigurationTextInput = {
  optionName: string;
  value: string;
  url?: string;
};

export type LegacyConfigurationTextInputs = Record<
  string,
  LegacyConfigurationTextInput
>;

export interface ServiceConfigurationSnapshotCalculatedPrice {
  currency: "EUR";
  total: number;
  basePrice: number;
  baseUnitPrice: number;
  optionPriceImpact: number;
  quantity: number;
}

export interface ServiceConfigurationSnapshotSelectedOption {
  fieldKey: string;
  fieldLabel: string;
  valueKey: string | null;
  valueLabel: string;
  priceImpact: number;
}

export interface ServiceConfigurationSnapshotPricingTier {
  id: string | null;
  label: string;
  quantity: number;
  price: number;
}

export interface ServiceConfigurationSnapshotArea {
  widthCm: number;
  heightCm: number;
  areaSqm: number;
  pricePerSqm: number;
}

export interface ServiceConfigurationSnapshotUploadFile {
  fileName: string;
  originalName?: string | null;
  customerLabel: string | null;
  fileType: string | null;
  contentType?: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  bucket?: string | null;
  path?: string | null;
  uploadedAt?: string | null;
}

export interface ServiceConfigurationSnapshotUploadField {
  fieldKey: string;
  fieldLabel: string;
  files: ServiceConfigurationSnapshotUploadFile[];
}

export interface ServiceConfigurationSnapshotTextField {
  fieldKey: string;
  fieldLabel: string;
  value: string;
  kind: "text" | "number";
}

export interface ServiceConfigurationSnapshotValue {
  fieldKey: string;
  fieldLabel: string;
  value: string;
}

export interface ServiceConfigurationSnapshotColorValue
  extends ServiceConfigurationSnapshotValue {
  hex: string;
}

export interface ServiceConfigurationSnapshotDesignMetadata {
  model: string;
  color: string;
  frontLogoCount: number;
  backLogoCount: number;
}

export interface ServiceConfigurationSnapshot {
  version: 1;
  serviceId: string;
  serviceName: string;
  pricingModel: NormalizedServicePricingMode;
  calculatedPrice: ServiceConfigurationSnapshotCalculatedPrice;
  quantity: number;
  selectedOptions: ServiceConfigurationSnapshotSelectedOption[];
  selectedPricingTier: ServiceConfigurationSnapshotPricingTier | null;
  area: ServiceConfigurationSnapshotArea | null;
  uploadFields: ServiceConfigurationSnapshotUploadField[];
  textFields: ServiceConfigurationSnapshotTextField[];
  size: ServiceConfigurationSnapshotValue | null;
  color: ServiceConfigurationSnapshotColorValue | null;
  design: ServiceConfigurationSnapshotDesignMetadata | null;
  customerNotes: string | null;
  orderNotes: string | null;
  customQuote: boolean;
}

export interface StoredOrderTextInputsEnvelope {
  entries: LegacyConfigurationTextInputs;
  configurationSnapshot: ServiceConfigurationSnapshot | null;
}

type LegacySnapshotSource = {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  totalPrice: number;
  quantity: number;
  selectedOptions: LegacyConfigurationSelectedOptions;
  textInputs: LegacyConfigurationTextInputs;
  designData?: unknown;
  orderNotes?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizeSafeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  return fallback;
}

function normalizePositiveNumber(value: unknown, fallback = 0): number {
  return Math.max(0, normalizeSafeNumber(value, fallback));
}

function normalizePositiveInteger(value: unknown, fallback = 0): number {
  return Math.max(0, Math.trunc(normalizeSafeNumber(value, fallback)));
}

function normalizePricingModel(value: unknown): NormalizedServicePricingMode {
  switch (value) {
    case "fixed":
    case "quantity_tiers":
    case "area":
    case "option_based":
    case "custom_quote":
      return value;
    default:
      return "fixed";
  }
}

function parseLegacyPricingModel(
  textInputs: LegacyConfigurationTextInputs,
  selectedOptions: LegacyConfigurationSelectedOptions,
): NormalizedServicePricingMode {
  const configuredMode = textInputs.pricing_model?.value?.trim().toLowerCase();

  if (configuredMode?.includes("mengenstaffel")) {
    return "quantity_tiers";
  }

  if (configuredMode?.includes("flaechenpreis")) {
    return "area";
  }

  if (configuredMode?.includes("anfrage")) {
    return "custom_quote";
  }

  const hasPricedOptions = Object.values(selectedOptions).some(
    (option) => normalizePositiveNumber(option.price) > 0,
  );

  return hasPricedOptions ? "option_based" : "fixed";
}

function parseDimensionValue(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return 0;
  }

  return normalizePositiveNumber(match[0].replace(",", "."));
}

function parseAreaData(
  textInputs: LegacyConfigurationTextInputs,
  totalPrice: number,
): ServiceConfigurationSnapshotArea | null {
  const widthCm = parseDimensionValue(textInputs.pricing_width_cm?.value);
  const heightCm = parseDimensionValue(textInputs.pricing_height_cm?.value);
  const areaSqm = parseDimensionValue(textInputs.pricing_area_sqm?.value);

  if (widthCm <= 0 && heightCm <= 0 && areaSqm <= 0) {
    return null;
  }

  const normalizedAreaSqm =
    areaSqm > 0 ? areaSqm : (widthCm / 100) * (heightCm / 100);
  const pricePerSqm =
    normalizedAreaSqm > 0 ? totalPrice / normalizedAreaSqm : 0;

  return {
    widthCm,
    heightCm,
    areaSqm: normalizePositiveNumber(normalizedAreaSqm),
    pricePerSqm: normalizePositiveNumber(pricePerSqm),
  };
}

function getUploadGroupKey(storageKey: string): string {
  const normalizedKey = storageKey.replace(/^(upload_|file_)/, "");
  const slotSuffixMatch = normalizedKey.match(/^(.*)_\d+$/);
  return slotSuffixMatch ? slotSuffixMatch[1] ?? normalizedKey : normalizedKey;
}

function getUploadGroupLabel(optionName: string, storageKey: string): string {
  const slotSuffixMatch = storageKey.match(/_\d+$/);
  if (!slotSuffixMatch) {
    return optionName;
  }

  return optionName.replace(/\s+\d+$/, "").trim() || optionName;
}

function getFileTypeFromName(fileName: string): string | null {
  const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i);
  return extensionMatch?.[1]?.toLowerCase() ?? null;
}

function isUploadStorageKey(storageKey: string): boolean {
  return storageKey.startsWith("upload_") || storageKey.startsWith("file_");
}

function parseUploadFields(
  textInputs: LegacyConfigurationTextInputs,
): ServiceConfigurationSnapshotUploadField[] {
  const uploadGroups = new Map<string, ServiceConfigurationSnapshotUploadField>();

  Object.entries(textInputs).forEach(([storageKey, input]) => {
    if (!isUploadStorageKey(storageKey) || storageKey.endsWith("_label")) {
      return;
    }

    const groupKey = getUploadGroupKey(storageKey);
    const groupLabel = getUploadGroupLabel(input.optionName, storageKey);
    const customerLabel = normalizeOptionalString(
      textInputs[`${storageKey}_label`]?.value,
    );

    const currentGroup = uploadGroups.get(groupKey) ?? {
      fieldKey: groupKey,
      fieldLabel: groupLabel,
      files: [],
    };

    currentGroup.files.push({
      fileName: input.value,
      originalName: input.value,
      customerLabel,
      fileType: getFileTypeFromName(input.value),
      contentType: null,
      fileSize: null,
      fileUrl: normalizeOptionalString(input.url),
      bucket: null,
      path: null,
      uploadedAt: null,
    });

    uploadGroups.set(groupKey, currentGroup);
  });

  return Array.from(uploadGroups.values());
}

function buildDesignMetadata(
  designData: unknown,
): ServiceConfigurationSnapshotDesignMetadata | null {
  if (!isRecord(designData)) {
    return null;
  }

  const model = normalizeOptionalString(designData.model);
  const color = normalizeOptionalString(designData.color);

  if (!model || !color) {
    return null;
  }

  const frontLogos = Array.isArray(designData.frontLogos)
    ? designData.frontLogos
    : [];
  const backLogos = Array.isArray(designData.backLogos)
    ? designData.backLogos
    : [];

  return {
    model,
    color,
    frontLogoCount: frontLogos.length,
    backLogoCount: backLogos.length,
  };
}

function buildColorValue(
  designMetadata: ServiceConfigurationSnapshotDesignMetadata | null,
): ServiceConfigurationSnapshotColorValue | null {
  if (!designMetadata) {
    return null;
  }

  return {
    fieldKey: "product_color",
    fieldLabel: "Produktfarbe",
    value: designMetadata.color,
    hex: designMetadata.color,
  };
}

function normalizeTextInputRecord(
  value: unknown,
): LegacyConfigurationTextInputs {
  if (!isRecord(value)) {
    return {};
  }

  const result: LegacyConfigurationTextInputs = {};

  Object.entries(value).forEach(([key, entry]) => {
    if (!isRecord(entry)) {
      return;
    }

    const optionName = normalizeOptionalString(entry.optionName);
    const entryValue = normalizeOptionalString(entry.value);

    if (!optionName || entryValue === null) {
      return;
    }

    const url = normalizeOptionalString(entry.url);

    result[key] = url
      ? { optionName, value: entryValue, url }
      : { optionName, value: entryValue };
  });

  return result;
}

function normalizeSelectedOptionsRecord(
  value: unknown,
): LegacyConfigurationSelectedOptions {
  if (!isRecord(value)) {
    return {};
  }

  const result: LegacyConfigurationSelectedOptions = {};

  Object.entries(value).forEach(([key, entry]) => {
    if (!isRecord(entry)) {
      return;
    }

    const optionName = normalizeOptionalString(entry.optionName);
    const valueName = normalizeOptionalString(entry.valueName);

    if (!optionName || !valueName) {
      return;
    }

    result[key] = {
      optionName,
      valueName,
      price: normalizePositiveNumber(entry.price),
    };
  });

  return result;
}

export function createConfigurationSnapshot(input: {
  serviceId: string;
  serviceName: string;
  pricingModel: NormalizedServicePricingMode;
  calculatedPrice: ServiceConfigurationSnapshotCalculatedPrice;
  quantity: number;
  selectedOptions?: ServiceConfigurationSnapshotSelectedOption[];
  selectedPricingTier?: ServiceConfigurationSnapshotPricingTier | null;
  area?: ServiceConfigurationSnapshotArea | null;
  uploadFields?: ServiceConfigurationSnapshotUploadField[];
  textFields?: ServiceConfigurationSnapshotTextField[];
  size?: ServiceConfigurationSnapshotValue | null;
  color?: ServiceConfigurationSnapshotColorValue | null;
  design?: ServiceConfigurationSnapshotDesignMetadata | null;
  customerNotes?: string | null;
  orderNotes?: string | null;
  customQuote?: boolean;
}): ServiceConfigurationSnapshot {
  return {
    version: 1,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    pricingModel: normalizePricingModel(input.pricingModel),
    calculatedPrice: {
      currency: "EUR",
      total: normalizePositiveNumber(input.calculatedPrice.total),
      basePrice: normalizePositiveNumber(input.calculatedPrice.basePrice),
      baseUnitPrice: normalizePositiveNumber(input.calculatedPrice.baseUnitPrice),
      optionPriceImpact: normalizePositiveNumber(
        input.calculatedPrice.optionPriceImpact,
      ),
      quantity: Math.max(1, normalizePositiveInteger(input.quantity, 1)),
    },
    quantity: Math.max(1, normalizePositiveInteger(input.quantity, 1)),
    selectedOptions: input.selectedOptions ?? [],
    selectedPricingTier: input.selectedPricingTier ?? null,
    area: input.area ?? null,
    uploadFields: input.uploadFields ?? [],
    textFields: input.textFields ?? [],
    size: input.size ?? null,
    color: input.color ?? null,
    design: input.design ?? null,
    customerNotes: normalizeOptionalString(input.customerNotes) ?? null,
    orderNotes: normalizeOptionalString(input.orderNotes) ?? null,
    customQuote: Boolean(input.customQuote),
  };
}

export function buildLegacyConfigurationSnapshot(
  source: LegacySnapshotSource,
): ServiceConfigurationSnapshot {
  const pricingModel = parseLegacyPricingModel(
    source.textInputs,
    source.selectedOptions,
  );
  const design = buildDesignMetadata(source.designData);
  const sizeValue = normalizeOptionalString(source.textInputs.size?.value);
  const selectedPricingTierLabel = normalizeOptionalString(
    source.textInputs.pricing_tier?.value,
  );
  const area = parseAreaData(source.textInputs, source.totalPrice);

  return createConfigurationSnapshot({
    serviceId: source.serviceId,
    serviceName: source.serviceName,
    pricingModel,
    calculatedPrice: {
      currency: "EUR",
      total: normalizePositiveNumber(source.totalPrice),
      basePrice: normalizePositiveNumber(source.basePrice),
      baseUnitPrice:
        source.quantity > 0
          ? normalizePositiveNumber(source.totalPrice / source.quantity)
          : normalizePositiveNumber(source.totalPrice),
      optionPriceImpact: normalizePositiveNumber(
        Object.values(source.selectedOptions).reduce(
          (sum, option) => sum + normalizePositiveNumber(option.price),
          0,
        ),
      ),
      quantity: Math.max(1, source.quantity),
    },
    quantity: Math.max(1, source.quantity),
    selectedOptions: Object.entries(source.selectedOptions).map(([key, option]) => ({
      fieldKey: key,
      fieldLabel: option.optionName,
      valueKey: null,
      valueLabel: option.valueName,
      priceImpact: normalizePositiveNumber(option.price),
    })),
    selectedPricingTier: selectedPricingTierLabel
      ? {
          id: null,
          label: selectedPricingTierLabel,
          quantity: 0,
          price: 0,
        }
      : null,
    area,
    uploadFields: parseUploadFields(source.textInputs),
    textFields: Object.entries(source.textInputs)
      .filter(([key]) => {
        return (
          key !== "size" &&
          key !== "pricing_model" &&
          key !== "pricing_tier" &&
          key !== "pricing_width_cm" &&
          key !== "pricing_height_cm" &&
          key !== "pricing_area_sqm" &&
          !isUploadStorageKey(key)
        );
      })
      .map(([key, input]) => ({
        fieldKey: key,
        fieldLabel: input.optionName,
        value: input.value,
        kind: "text" as const,
      })),
    size: sizeValue
      ? {
          fieldKey: "size",
          fieldLabel: source.textInputs.size?.optionName ?? "Groesse",
          value: sizeValue,
        }
      : null,
    color: buildColorValue(design),
    design,
    customerNotes: source.orderNotes,
    orderNotes: source.orderNotes,
    customQuote: pricingModel === "custom_quote",
  });
}

function parseSelectedOption(
  value: unknown,
): ServiceConfigurationSnapshotSelectedOption | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldKey = normalizeOptionalString(value.fieldKey);
  const fieldLabel = normalizeOptionalString(value.fieldLabel);
  const valueLabel = normalizeOptionalString(value.valueLabel);

  if (!fieldKey || !fieldLabel || !valueLabel) {
    return null;
  }

  return {
    fieldKey,
    fieldLabel,
    valueKey: normalizeOptionalString(value.valueKey),
    valueLabel,
    priceImpact: normalizePositiveNumber(value.priceImpact),
  };
}

function parseSelectedPricingTier(
  value: unknown,
): ServiceConfigurationSnapshotPricingTier | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = normalizeOptionalString(value.label);
  if (!label) {
    return null;
  }

  return {
    id: normalizeOptionalString(value.id),
    label,
    quantity: normalizePositiveInteger(value.quantity),
    price: normalizePositiveNumber(value.price),
  };
}

function parseAreaSnapshot(
  value: unknown,
): ServiceConfigurationSnapshotArea | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    widthCm: normalizePositiveNumber(value.widthCm),
    heightCm: normalizePositiveNumber(value.heightCm),
    areaSqm: normalizePositiveNumber(value.areaSqm),
    pricePerSqm: normalizePositiveNumber(value.pricePerSqm),
  };
}

function parseUploadFile(
  value: unknown,
): ServiceConfigurationSnapshotUploadFile | null {
  if (!isRecord(value)) {
    return null;
  }

  const fileName = normalizeOptionalString(value.fileName);
  if (!fileName) {
    return null;
  }

  const parsedFileSize = normalizeSafeNumber(value.fileSize, -1);

  return {
    fileName,
    originalName: normalizeOptionalString(value.originalName) ?? fileName,
    customerLabel: normalizeOptionalString(value.customerLabel),
    fileType: normalizeOptionalString(value.fileType),
    contentType: normalizeOptionalString(value.contentType),
    fileSize: parsedFileSize >= 0 ? parsedFileSize : null,
    fileUrl: normalizeOptionalString(value.fileUrl),
    bucket: normalizeOptionalString(value.bucket),
    path: normalizeOptionalString(value.path),
    uploadedAt: normalizeOptionalString(value.uploadedAt),
  };
}

function parseUploadField(
  value: unknown,
): ServiceConfigurationSnapshotUploadField | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldKey = normalizeOptionalString(value.fieldKey);
  const fieldLabel = normalizeOptionalString(value.fieldLabel);

  if (!fieldKey || !fieldLabel) {
    return null;
  }

  const rawFiles = Array.isArray(value.files) ? value.files : [];
  const files = rawFiles
    .map((file) => parseUploadFile(file))
    .filter((file): file is ServiceConfigurationSnapshotUploadFile => file !== null);

  return {
    fieldKey,
    fieldLabel,
    files,
  };
}

function parseTextField(
  value: unknown,
): ServiceConfigurationSnapshotTextField | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldKey = normalizeOptionalString(value.fieldKey);
  const fieldLabel = normalizeOptionalString(value.fieldLabel);
  const fieldValue = normalizeOptionalString(value.value);

  if (!fieldKey || !fieldLabel || fieldValue === null) {
    return null;
  }

  return {
    fieldKey,
    fieldLabel,
    value: fieldValue,
    kind: value.kind === "number" ? "number" : "text",
  };
}

function parseValueSnapshot(
  value: unknown,
): ServiceConfigurationSnapshotValue | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldKey = normalizeOptionalString(value.fieldKey);
  const fieldLabel = normalizeOptionalString(value.fieldLabel);
  const fieldValue = normalizeOptionalString(value.value);

  if (!fieldKey || !fieldLabel || fieldValue === null) {
    return null;
  }

  return {
    fieldKey,
    fieldLabel,
    value: fieldValue,
  };
}

function parseColorSnapshot(
  value: unknown,
): ServiceConfigurationSnapshotColorValue | null {
  if (!isRecord(value)) {
    return null;
  }

  const baseValue = parseValueSnapshot(value);
  const hex = normalizeOptionalString(value.hex);

  if (!baseValue || !hex) {
    return null;
  }

  return {
    ...baseValue,
    hex,
  };
}

function parseDesignSnapshot(
  value: unknown,
): ServiceConfigurationSnapshotDesignMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  const model = normalizeOptionalString(value.model);
  const color = normalizeOptionalString(value.color);

  if (!model || !color) {
    return null;
  }

  return {
    model,
    color,
    frontLogoCount: normalizePositiveInteger(value.frontLogoCount),
    backLogoCount: normalizePositiveInteger(value.backLogoCount),
  };
}

export function parseConfigurationSnapshot(
  value: unknown,
): ServiceConfigurationSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const serviceId = normalizeOptionalString(value.serviceId);
  const serviceName = normalizeOptionalString(value.serviceName);
  const calculatedPrice = isRecord(value.calculatedPrice)
    ? value.calculatedPrice
    : null;

  if (!serviceId || !serviceName || !calculatedPrice) {
    return null;
  }

  const rawSelectedOptions = Array.isArray(value.selectedOptions)
    ? value.selectedOptions
    : [];
  const rawUploadFields = Array.isArray(value.uploadFields)
    ? value.uploadFields
    : [];
  const rawTextFields = Array.isArray(value.textFields) ? value.textFields : [];

  return createConfigurationSnapshot({
    serviceId,
    serviceName,
    pricingModel: normalizePricingModel(value.pricingModel),
    calculatedPrice: {
      currency: "EUR",
      total: normalizePositiveNumber(calculatedPrice.total),
      basePrice: normalizePositiveNumber(calculatedPrice.basePrice),
      baseUnitPrice: normalizePositiveNumber(calculatedPrice.baseUnitPrice),
      optionPriceImpact: normalizePositiveNumber(
        calculatedPrice.optionPriceImpact,
      ),
      quantity: Math.max(
        1,
        normalizePositiveInteger(
          calculatedPrice.quantity ?? value.quantity,
          1,
        ),
      ),
    },
    quantity: Math.max(1, normalizePositiveInteger(value.quantity, 1)),
    selectedOptions: rawSelectedOptions
      .map((entry) => parseSelectedOption(entry))
      .filter(
        (entry): entry is ServiceConfigurationSnapshotSelectedOption =>
          entry !== null,
      ),
    selectedPricingTier: parseSelectedPricingTier(value.selectedPricingTier),
    area: parseAreaSnapshot(value.area),
    uploadFields: rawUploadFields
      .map((entry) => parseUploadField(entry))
      .filter(
        (entry): entry is ServiceConfigurationSnapshotUploadField =>
          entry !== null,
      ),
    textFields: rawTextFields
      .map((entry) => parseTextField(entry))
      .filter(
        (entry): entry is ServiceConfigurationSnapshotTextField =>
          entry !== null,
      ),
    size: parseValueSnapshot(value.size),
    color: parseColorSnapshot(value.color),
    design: parseDesignSnapshot(value.design),
    customerNotes: normalizeOptionalString(value.customerNotes),
    orderNotes: normalizeOptionalString(value.orderNotes),
    customQuote: value.customQuote === true,
  });
}

export function wrapOrderTextInputsWithSnapshot(
  textInputs: LegacyConfigurationTextInputs,
  configurationSnapshot?: ServiceConfigurationSnapshot,
): StoredOrderTextInputsEnvelope {
  return {
    entries: textInputs,
    configurationSnapshot: configurationSnapshot ?? null,
  };
}

export function extractStoredOrderTextInputs(
  value: unknown,
): {
  textInputs: LegacyConfigurationTextInputs;
  configurationSnapshot: ServiceConfigurationSnapshot | null;
} {
  if (!isRecord(value)) {
    return {
      textInputs: {},
      configurationSnapshot: null,
    };
  }

  if (isRecord(value.entries)) {
    return {
      textInputs: normalizeTextInputRecord(value.entries),
      configurationSnapshot: parseConfigurationSnapshot(
        value.configurationSnapshot,
      ),
    };
  }

  return {
    textInputs: normalizeTextInputRecord(value),
    configurationSnapshot: null,
  };
}

export function normalizeLegacySelectedOptions(
  value: unknown,
): LegacyConfigurationSelectedOptions {
  return normalizeSelectedOptionsRecord(value);
}

export function getSnapshotOrBuildLegacy(source: LegacySnapshotSource & {
  configurationSnapshot?: unknown;
}): ServiceConfigurationSnapshot {
  return (
    parseConfigurationSnapshot(source.configurationSnapshot) ??
    buildLegacyConfigurationSnapshot({
      serviceId: source.serviceId,
      serviceName: source.serviceName,
      basePrice: source.basePrice,
      totalPrice: source.totalPrice,
      quantity: source.quantity,
      selectedOptions: source.selectedOptions,
      textInputs: source.textInputs,
      designData: source.designData,
      orderNotes: source.orderNotes,
    })
  );
}

export function getPricingModelLabel(
  pricingModel: NormalizedServicePricingMode,
): string {
  switch (pricingModel) {
    case "quantity_tiers":
      return "Mengenstaffel";
    case "area":
      return "Flaechenpreis";
    case "option_based":
      return "Optionspreis";
    case "custom_quote":
      return "Preis auf Anfrage";
    case "fixed":
    default:
      return "Festpreis";
  }
}
