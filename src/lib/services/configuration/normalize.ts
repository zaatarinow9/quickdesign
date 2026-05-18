import type {
  NormalizedAreaPricingSettings,
  NormalizedDesignModel,
  NormalizedFieldKind,
  NormalizedPricingMode,
  NormalizedQuantityTier,
  NormalizedServiceConfig,
  NormalizedServiceField,
  NormalizedServicePricingConfig,
  NormalizedServicePricingMode,
  NormalizedUploadField,
  NormalizedUploadSettings,
} from "./types";

type LegacyOptionValue = {
  id: string;
  name: string;
  price: number;
  order?: number | null;
  metadataJson?: string | null;
};

type LegacyServiceOption = {
  id: string;
  key?: string | null;
  name: string;
  type: string;
  isRequired: boolean;
  order: number;
  helperText?: string | null;
  pricingMode?: string | null;
  configJson?: string | null;
  values: LegacyOptionValue[];
};

type ParsedFieldConfig = {
  adminKind?: string;
  placeholder?: string;
  accept?: string;
  defaultValueId?: string;
  defaultValueName?: string;
};

type ParsedValueMetadata = {
  value?: string;
};

type ParsedServiceConfig = {
  quantityTiers: NormalizedQuantityTier[];
  area: NormalizedAreaPricingSettings | null;
  hasExplicitUploadFields: boolean;
  uploadFields: NormalizedUploadField[];
};

export type LegacyServiceConfigurationSource = {
  id: string;
  basePrice: number;
  hasDesigner: boolean;
  hasColorPicker: boolean;
  fileLimit: number;
  designerType: string;
  pricingMode?: string | null;
  configJson?: string | null;
  options: LegacyServiceOption[];
};

const DEFAULT_DESIGN_MODEL: NormalizedDesignModel = "tee";
const DEFAULT_DESIGN_COLOR = "#FFFFFF";
const DEFAULT_AREA_WIDTH_LABEL = "Breite (cm)";
const DEFAULT_AREA_HEIGHT_LABEL = "Hoehe (cm)";
const DEFAULT_UPLOAD_LABEL = "Druckdatei";
const DEFAULT_UPLOAD_TYPES_TEXT = "Alle Dateitypen";
const LEGACY_SIZE_VALUES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;
const LEGACY_OVERRIDE_KEYWORDS = [
  /stück/i,
  /stueck/i,
  /stuck/i,
  /menge/i,
  /\bqty\b/i,
  /quantity/i,
  /\bsets?\b/i,
  /\bpcs?\b/i,
] as const;

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function normalizeSortOrder(
  value: number | null | undefined,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : fallback;
}

function normalizeFiniteNumber(
  value: number | null | undefined,
  fallback = 0,
): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeParsedNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalizedValue = Math.trunc(value);
    return normalizedValue > 0 ? normalizedValue : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonObject(
  rawJson: string | null | undefined,
  fallbackLabel: string,
  legacyFallbacks: string[],
): Record<string, unknown> | null {
  const normalizedJson = normalizeOptionalString(rawJson);
  if (!normalizedJson) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(normalizedJson);

    if (isRecord(parsedValue)) {
      return parsedValue;
    }

    legacyFallbacks.push(
      `${fallbackLabel} contained non-object JSON and was ignored.`,
    );
    return null;
  } catch {
    legacyFallbacks.push(`${fallbackLabel} contained invalid JSON and was ignored.`);
    return null;
  }
}

function getObjectString(
  source: Record<string, unknown> | null,
  key: string,
): string | undefined {
  const value = source?.[key];
  return typeof value === "string" ? normalizeOptionalString(value) : undefined;
}

function getObjectNumber(
  source: Record<string, unknown> | null,
  key: string,
): number | undefined {
  const value = source?.[key];
  const normalizedValue = normalizeParsedNumber(value);
  return normalizedValue === null ? undefined : normalizedValue;
}

function getObjectBoolean(
  source: Record<string, unknown> | null,
  key: string,
): boolean | undefined {
  const value = source?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeAllowedFileTypesText(value: string | undefined): string {
  return value ?? DEFAULT_UPLOAD_TYPES_TEXT;
}

function normalizeAcceptString(value: string | undefined): string {
  const normalizedValue = normalizeOptionalString(value);
  if (!normalizedValue) {
    return "*/*";
  }

  const segments = normalizedValue
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");

  if (segments.length === 0) {
    return "*/*";
  }

  const normalizedSegments = segments.map((segment) => {
    if (segment === "*/*" || segment.endsWith("/*")) {
      return segment;
    }

    if (segment.startsWith(".")) {
      return segment.toLowerCase();
    }

    if (segment.includes("/")) {
      return segment.toLowerCase();
    }

    return `.${segment.toLowerCase()}`;
  });

  return normalizedSegments.join(",");
}

function parseFieldConfig(
  option: LegacyServiceOption,
  legacyFallbacks: string[],
): ParsedFieldConfig {
  const parsedConfig = parseJsonObject(
    option.configJson,
    `Config for "${option.name}"`,
    legacyFallbacks,
  );

  return {
    adminKind: getObjectString(parsedConfig, "adminKind"),
    placeholder: getObjectString(parsedConfig, "placeholder"),
    accept: getObjectString(parsedConfig, "accept"),
    defaultValueId: getObjectString(parsedConfig, "defaultValueId"),
    defaultValueName: getObjectString(parsedConfig, "defaultValueName"),
  };
}

function parseValueMetadata(
  value: LegacyOptionValue,
  optionName: string,
  legacyFallbacks: string[],
): ParsedValueMetadata {
  const parsedMetadata = parseJsonObject(
    value.metadataJson,
    `Metadata for value "${value.name}" on "${optionName}"`,
    legacyFallbacks,
  );

  return {
    value: getObjectString(parsedMetadata, "value"),
  };
}

function normalizeConfiguredKind(
  adminKind: string | undefined,
  optionName: string,
  legacyFallbacks: string[],
): NormalizedFieldKind | null {
  if (!adminKind) {
    return null;
  }

  switch (adminKind.toLowerCase()) {
    case "select":
      return "select";
    case "radio":
      return "radio";
    case "text":
      return "text";
    case "number":
      return "number";
    case "file":
      return "file";
    case "size":
      return "size";
    case "color":
      return "radio";
    case "textarea":
      return "text";
    default:
      legacyFallbacks.push(
        `Unknown configured field kind "${adminKind}" on "${optionName}" was ignored.`,
      );
      return null;
  }
}

function normalizeFieldKind(
  rawType: string,
  hasValues: boolean,
  optionName: string,
  config: ParsedFieldConfig,
  legacyFallbacks: string[],
): NormalizedFieldKind {
  const configuredKind = normalizeConfiguredKind(
    config.adminKind,
    optionName,
    legacyFallbacks,
  );

  if (configuredKind) {
    return configuredKind;
  }

  switch (rawType.toLowerCase()) {
    case "size":
      return "size";
    case "color":
      return "radio";
    case "textarea":
      return "text";
    case "select":
      return "select";
    case "radio":
      return "radio";
    case "text":
      return "text";
    case "number":
      return "number";
    case "file":
      return "file";
    default:
      legacyFallbacks.push(
        `Unknown option type "${rawType}" on "${optionName}" was normalized to "${hasValues ? "select" : "text"}".`,
      );
      return hasValues ? "select" : "text";
  }
}

function normalizeExplicitFieldPricingMode(
  rawMode: string | null | undefined,
  optionName: string,
  legacyFallbacks: string[],
): NormalizedPricingMode | null {
  const normalizedMode = normalizeOptionalString(rawMode)?.toLowerCase();

  switch (normalizedMode) {
    case undefined:
      return null;
    case "included":
      return "included";
    case "additive":
      return "additive";
    case "override_base":
      return "override_base";
    default:
      legacyFallbacks.push(
        `Unknown pricing mode "${rawMode}" on "${optionName}" was ignored.`,
      );
      return null;
  }
}

function inferLegacyFieldPricingMode(
  option: LegacyServiceOption,
  kind: NormalizedFieldKind,
  legacyFallbacks: string[],
): NormalizedPricingMode {
  if (kind !== "select" && kind !== "radio" && kind !== "size") {
    return "included";
  }

  const hasPricedValues = option.values.some((value) => value.price !== 0);
  if (!hasPricedValues) {
    return "included";
  }

  const matchesLegacyOverride = LEGACY_OVERRIDE_KEYWORDS.some((pattern) =>
    pattern.test(option.name),
  );

  if (matchesLegacyOverride) {
    legacyFallbacks.push(
      `Legacy pricing fallback inferred "${option.name}" as "override_base" from its label because no explicit field pricing mode exists yet.`,
    );
    return "override_base";
  }

  return "additive";
}

function resolveFieldPricingMode(
  option: LegacyServiceOption,
  kind: NormalizedFieldKind,
  legacyFallbacks: string[],
): NormalizedPricingMode {
  return (
    normalizeExplicitFieldPricingMode(
      option.pricingMode,
      option.name,
      legacyFallbacks,
    ) ?? inferLegacyFieldPricingMode(option, kind, legacyFallbacks)
  );
}

function isValueFieldKind(
  kind: NormalizedFieldKind,
): kind is "select" | "radio" | "size" {
  return kind === "select" || kind === "radio" || kind === "size";
}

function createLegacySizeField(): NormalizedServiceField {
  const values = LEGACY_SIZE_VALUES.map((size) => ({
    id: `legacy:size:${size}`,
    label: size,
    value: size,
    price: 0,
  }));

  const defaultValueId =
    values.find((value) => value.value === "M")?.id ?? values[0]?.id;

  return {
    id: "legacy:size",
    key: "size",
    label: "Groesse",
    kind: "size",
    source: "legacy",
    required: true,
    order: -100,
    pricingMode: "included",
    values,
    defaultValueId,
  };
}

function createNormalizedOptionField(
  option: LegacyServiceOption,
  index: number,
  legacyFallbacks: string[],
): NormalizedServiceField {
  const config = parseFieldConfig(option, legacyFallbacks);
  const kind = normalizeFieldKind(
    option.type,
    option.values.length > 0,
    option.name,
    config,
    legacyFallbacks,
  );
  const pricingMode = resolveFieldPricingMode(option, kind, legacyFallbacks);
  const orderedValues = [...option.values]
    .sort((left, right) => {
      const leftOrder = normalizeSortOrder(left.order, 0);
      const rightOrder = normalizeSortOrder(right.order, 0);

      if (leftOrder === rightOrder) {
        return 0;
      }

      return leftOrder - rightOrder;
    })
    .map((value, valueIndex) => {
      const metadata = parseValueMetadata(value, option.name, legacyFallbacks);

      return {
        id: value.id,
        label: value.name,
        value: metadata.value ?? value.name,
        price: normalizeFiniteNumber(value.price),
        sortOrder: normalizeSortOrder(value.order, valueIndex + 1),
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const defaultValueId =
    orderedValues.find((value) => value.id === config.defaultValueId)?.id ??
    orderedValues.find((value) => value.value === config.defaultValueName)?.id;

  return {
    id: option.id,
    key: normalizeOptionalString(option.key) ?? option.id,
    label: option.name,
    kind,
    source: "option",
    sourceOptionId: option.id,
    required: option.isRequired,
    order: normalizeSortOrder(option.order, index),
    pricingMode,
    values: orderedValues.map(({ id, label, value, price }) => ({
      id,
      label,
      value,
      price,
    })),
    helperText: normalizeOptionalString(option.helperText),
    defaultValueId,
    placeholder:
      kind === "text" || kind === "number"
        ? config.placeholder ?? option.name
        : undefined,
    accept: kind === "file" ? config.accept ?? "*/*" : undefined,
  };
}

function parseExplicitServicePricingMode(
  rawMode: string | null | undefined,
  legacyFallbacks: string[],
): NormalizedServicePricingMode | null {
  const normalizedMode = normalizeOptionalString(rawMode)?.toLowerCase();

  switch (normalizedMode) {
    case undefined:
      return null;
    case "fixed":
      return "fixed";
    case "quantity_tiers":
      return "quantity_tiers";
    case "area":
      return "area";
    case "option_based":
      return "option_based";
    case "custom_quote":
      return "custom_quote";
    default:
      legacyFallbacks.push(
        `Unknown service pricing mode "${rawMode}" was ignored.`,
      );
      return null;
  }
}

function buildQuantityTier(
  rawTier: unknown,
  index: number,
): NormalizedQuantityTier | null {
  if (!isRecord(rawTier)) {
    return null;
  }

  const quantity = normalizePositiveInteger(rawTier.quantity);
  const price = normalizeParsedNumber(rawTier.price);

  if (quantity === null || price === null || price < 0) {
    return null;
  }

  const label =
    getObjectString(rawTier, "label") ?? `${quantity} Stueck`;

  return {
    id: getObjectString(rawTier, "id") ?? `service:tier:${index + 1}:${quantity}`,
    label,
    quantity,
    price,
  };
}

function parseConfiguredQuantityTiers(
  parsedConfig: Record<string, unknown> | null,
  legacyFallbacks: string[],
): NormalizedQuantityTier[] {
  const rawTiers = parsedConfig?.quantityTiers;

  if (rawTiers === undefined) {
    return [];
  }

  if (!Array.isArray(rawTiers)) {
    legacyFallbacks.push(
      `Service pricing config used a non-array "quantityTiers" value and it was ignored.`,
    );
    return [];
  }

  return rawTiers
    .map((tier, index) => buildQuantityTier(tier, index))
    .filter((tier): tier is NormalizedQuantityTier => tier !== null);
}

function parseConfiguredAreaSettings(
  parsedConfig: Record<string, unknown> | null,
): NormalizedAreaPricingSettings | null {
  const rawArea = parsedConfig?.area;
  const areaSource = isRecord(rawArea)
    ? rawArea
    : parsedConfig;

  if (!areaSource) {
    return null;
  }

  const pricePerSqm = getObjectNumber(areaSource, "pricePerSqm");
  if (pricePerSqm === undefined) {
    return null;
  }

  return {
    pricePerSqm: Math.max(0, pricePerSqm),
    minimumAreaSqm: Math.max(0, getObjectNumber(areaSource, "minimumAreaSqm") ?? 0),
    widthLabel: getObjectString(areaSource, "widthLabel") ?? DEFAULT_AREA_WIDTH_LABEL,
    heightLabel: getObjectString(areaSource, "heightLabel") ?? DEFAULT_AREA_HEIGHT_LABEL,
    unitLabel: "cm",
  };
}

function buildConfiguredUploadField(
  rawField: unknown,
  index: number,
): NormalizedUploadField | null {
  if (!isRecord(rawField)) {
    return null;
  }

  const label = getObjectString(rawField, "label");
  if (!label) {
    return null;
  }

  const requestedKey = getObjectString(rawField, "key");
  const normalizedKey = slugifyKey(requestedKey ?? label) || `upload_${index + 1}`;
  const allowedFileTypesText = normalizeAllowedFileTypesText(
    getObjectString(rawField, "allowedFileTypesText") ??
      getObjectString(rawField, "allowedFileTypes"),
  );
  const accept = normalizeAcceptString(
    getObjectString(rawField, "accept") ?? allowedFileTypesText,
  );
  const maxFiles = Math.max(1, normalizePositiveInteger(rawField.maxFiles) ?? 1);
  const maxFileSizeMb = getObjectNumber(rawField, "maxFileSizeMb");

  return {
    id:
      getObjectString(rawField, "id") ??
      `service:upload:${normalizedKey}:${index + 1}`,
    key: normalizedKey,
    label,
    helperText: getObjectString(rawField, "helperText"),
    required: getObjectBoolean(rawField, "required") ?? false,
    order: normalizeSortOrder(getObjectNumber(rawField, "order"), index + 1),
    accept,
    allowedFileTypesText,
    maxFiles,
    maxFileSizeMb:
      typeof maxFileSizeMb === "number" && Number.isFinite(maxFileSizeMb) && maxFileSizeMb > 0
        ? maxFileSizeMb
        : null,
    allowCustomerFileLabel:
      getObjectBoolean(rawField, "allowCustomerFileLabel") ?? false,
    source: "service",
  };
}

function parseConfiguredUploadFields(
  parsedConfig: Record<string, unknown> | null,
  legacyFallbacks: string[],
): {
  hasExplicitUploadFields: boolean;
  uploadFields: NormalizedUploadField[];
} {
  if (!parsedConfig) {
    return {
      hasExplicitUploadFields: false,
      uploadFields: [],
    };
  }

  const hasExplicitUploadFields = Object.prototype.hasOwnProperty.call(
    parsedConfig,
    "uploadFields",
  );

  if (!hasExplicitUploadFields) {
    return {
      hasExplicitUploadFields: false,
      uploadFields: [],
    };
  }

  const rawUploadFields = parsedConfig.uploadFields;
  if (!Array.isArray(rawUploadFields)) {
    legacyFallbacks.push(
      `Service upload config used a non-array "uploadFields" value and it was ignored.`,
    );
    return {
      hasExplicitUploadFields: true,
      uploadFields: [],
    };
  }

  const uploadFields = rawUploadFields
    .map((field, index) => buildConfiguredUploadField(field, index))
    .filter((field): field is NormalizedUploadField => field !== null)
    .sort((left, right) => left.order - right.order);

  return {
    hasExplicitUploadFields: true,
    uploadFields,
  };
}

function parseServiceConfig(
  service: LegacyServiceConfigurationSource,
  legacyFallbacks: string[],
): ParsedServiceConfig {
  const parsedConfig = parseJsonObject(
    service.configJson,
    `Config for service "${service.id}"`,
    legacyFallbacks,
  );
  const parsedUploadConfig = parseConfiguredUploadFields(parsedConfig, legacyFallbacks);

  return {
    quantityTiers: parseConfiguredQuantityTiers(parsedConfig, legacyFallbacks),
    area: parseConfiguredAreaSettings(parsedConfig),
    hasExplicitUploadFields: parsedUploadConfig.hasExplicitUploadFields,
    uploadFields: parsedUploadConfig.uploadFields,
  };
}

function inferLegacyTierQuantity(
  valueLabel: string,
  valueValue: string,
  index: number,
): number {
  const rawText = `${valueValue} ${valueLabel}`;
  const match = rawText.match(/\d[\d.,]*/);

  if (!match) {
    return index + 1;
  }

  const normalizedDigits = match[0].replace(/[^\d]/g, "");
  const parsedValue = Number.parseInt(normalizedDigits, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : index + 1;
}

function createLegacyQuantityTiers(
  field: NormalizedServiceField,
  legacyFallbacks: string[],
): NormalizedQuantityTier[] {
  legacyFallbacks.push(
    `Legacy quantity tiers were inferred from "${field.label}" because the service has no explicit pricing model yet.`,
  );

  return field.values.map((value, index) => ({
    id: value.id,
    label: value.label,
    quantity: inferLegacyTierQuantity(value.label, value.value, index),
    price: normalizeFiniteNumber(value.price),
  }));
}

function createLegacyUploadFields(
  service: LegacyServiceConfigurationSource,
): NormalizedUploadField[] {
  const slotCount =
    service.fileLimit > 0
      ? service.fileLimit
      : service.designerType === "none"
        ? 2
        : 0;

  return Array.from({ length: slotCount }).map((_, index) => ({
    id: `legacy:upload:${index + 1}`,
    key: `legacy_upload_${index + 1}`,
    label: `${DEFAULT_UPLOAD_LABEL} ${index + 1}`,
    required: false,
    order: index + 1,
    accept: "*/*",
    allowedFileTypesText: DEFAULT_UPLOAD_TYPES_TEXT,
    maxFiles: 1,
    maxFileSizeMb: null,
    allowCustomerFileLabel: false,
    source: "legacy",
  }));
}

function resolveUploadSettings(
  service: LegacyServiceConfigurationSource,
  parsedConfig: ParsedServiceConfig,
  legacyFallbacks: string[],
): NormalizedUploadSettings {
  if (parsedConfig.hasExplicitUploadFields) {
    if (
      parsedConfig.uploadFields.length === 0 &&
      (service.fileLimit > 0 || service.designerType === "none")
    ) {
      legacyFallbacks.push(
        `Explicit upload config overrides legacy fileLimit fallback for this service.`,
      );
    }

    return {
      enabled: parsedConfig.uploadFields.length > 0,
      fields: parsedConfig.uploadFields,
      slots: parsedConfig.uploadFields.reduce(
        (total, field) => total + field.maxFiles,
        0,
      ),
      accept:
        parsedConfig.uploadFields.length === 1
          ? parsedConfig.uploadFields[0]!.accept
          : "*/*",
      source: "service",
    };
  }

  const legacyFields = createLegacyUploadFields(service);

  return {
    enabled: legacyFields.length > 0,
    fields: legacyFields,
    slots: legacyFields.length,
    accept: "*/*",
    source: legacyFields.length > 0 ? "legacy" : "none",
  };
}

function hasAdditiveOptionPricing(fields: NormalizedServiceField[]): boolean {
  return fields.some(
    (field) =>
      isValueFieldKind(field.kind) &&
      field.pricingMode === "additive" &&
      field.values.some((value) => value.price !== 0),
  );
}

function createPricingConfig(
  mode: NormalizedServicePricingMode,
  quantityTiers: NormalizedQuantityTier[] = [],
  area: NormalizedAreaPricingSettings | null = null,
): NormalizedServicePricingConfig {
  return {
    mode,
    quantityTiers,
    area,
    isCustomQuote: mode === "custom_quote",
  };
}

function resolveServicePricing(
  service: LegacyServiceConfigurationSource,
  fields: NormalizedServiceField[],
  parsedConfig: ParsedServiceConfig,
  legacyFallbacks: string[],
): {
  pricing: NormalizedServicePricingConfig;
  fields: NormalizedServiceField[];
} {
  const explicitPricingMode = parseExplicitServicePricingMode(
    service.pricingMode,
    legacyFallbacks,
  );
  const legacyOverrideField = fields.find(
    (field) =>
      isValueFieldKind(field.kind) &&
      field.pricingMode === "override_base" &&
      field.values.length > 0,
  );

  if (explicitPricingMode === "custom_quote") {
    return {
      pricing: createPricingConfig("custom_quote"),
      fields,
    };
  }

  if (explicitPricingMode === "area") {
    if (parsedConfig.area && parsedConfig.area.pricePerSqm > 0) {
      return {
        pricing: createPricingConfig("area", [], parsedConfig.area),
        fields,
      };
    }

    legacyFallbacks.push(
      `Service pricing mode "area" was configured without a valid price per square meter and fell back to fixed pricing.`,
    );
  }

  if (explicitPricingMode === "quantity_tiers") {
    if (parsedConfig.quantityTiers.length > 0) {
      const filteredFields = fields.filter(
        (field) => field.pricingMode !== "override_base",
      );

      if (filteredFields.length !== fields.length) {
        legacyFallbacks.push(
          `Service pricing mode "quantity_tiers" hides legacy override fields in favor of explicit service-level tiers.`,
        );
      }

      return {
        pricing: createPricingConfig(
          "quantity_tiers",
          parsedConfig.quantityTiers,
        ),
        fields: filteredFields,
      };
    }

    if (legacyOverrideField) {
      return {
        pricing: createPricingConfig(
          "quantity_tiers",
          createLegacyQuantityTiers(legacyOverrideField, legacyFallbacks),
        ),
        fields: fields.filter((field) => field.id !== legacyOverrideField.id),
      };
    }

    legacyFallbacks.push(
      `Service pricing mode "quantity_tiers" was configured without valid tiers and fell back to fixed pricing.`,
    );
  }

  if (explicitPricingMode === "fixed" || explicitPricingMode === "option_based") {
    return {
      pricing: createPricingConfig(explicitPricingMode),
      fields,
    };
  }

  if (legacyOverrideField) {
    return {
      pricing: createPricingConfig(
        "quantity_tiers",
        createLegacyQuantityTiers(legacyOverrideField, legacyFallbacks),
      ),
      fields: fields.filter((field) => field.id !== legacyOverrideField.id),
    };
  }

  if (hasAdditiveOptionPricing(fields)) {
    legacyFallbacks.push(
      `Legacy pricing fallback inferred service-level mode "option_based" from additive option prices because no explicit pricing model exists yet.`,
    );
    return {
      pricing: createPricingConfig("option_based"),
      fields,
    };
  }

  return {
    pricing: createPricingConfig("fixed"),
    fields,
  };
}

export function normalizeServiceConfiguration(
  service: LegacyServiceConfigurationSource,
): NormalizedServiceConfig {
  const legacyFallbacks: string[] = [];
  const designEnabled = service.hasDesigner || service.designerType === "tshirt";
  const parsedServiceConfig = parseServiceConfig(service, legacyFallbacks);
  const uploadSettings = resolveUploadSettings(
    service,
    parsedServiceConfig,
    legacyFallbacks,
  );

  const fields: NormalizedServiceField[] = [];

  if (designEnabled) {
    fields.push(createLegacySizeField());
  }

  const orderedOptions = [...service.options].sort((left, right) => {
    const leftOrder = normalizeSortOrder(left.order, 0);
    const rightOrder = normalizeSortOrder(right.order, 0);

    if (leftOrder === rightOrder) {
      return 0;
    }

    return leftOrder - rightOrder;
  });

  orderedOptions.forEach((option, index) => {
    fields.push(createNormalizedOptionField(option, index + 1, legacyFallbacks));
  });

  const resolvedPricing = resolveServicePricing(
    service,
    fields,
    parsedServiceConfig,
    legacyFallbacks,
  );

  return {
    serviceId: service.id,
    basePrice: normalizeFiniteNumber(service.basePrice),
    pricing: resolvedPricing.pricing,
    fields: resolvedPricing.fields,
    uploadSettings,
    designSettings: {
      enabled: designEnabled,
      showCanvas: service.designerType === "tshirt",
      designerType: service.designerType,
      defaultModel: DEFAULT_DESIGN_MODEL,
      defaultColor: DEFAULT_DESIGN_COLOR,
      availableSizes: LEGACY_SIZE_VALUES,
      requiresSizeSelection: designEnabled,
      allowSecondaryColorPicker: service.hasColorPicker,
    },
    legacyFallbacks,
  };
}
