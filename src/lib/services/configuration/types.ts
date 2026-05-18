export type NormalizedFieldKind =
  | "select"
  | "radio"
  | "text"
  | "number"
  | "file"
  | "size";

export type NormalizedPricingMode =
  | "included"
  | "additive"
  | "override_base";

export type NormalizedServicePricingMode =
  | "fixed"
  | "quantity_tiers"
  | "area"
  | "option_based"
  | "custom_quote";

export type NormalizedDesignModel =
  | "tee"
  | "tank"
  | "hoodie"
  | "pullover"
  | "longsleeve"
  | "jacket";

export interface NormalizedOptionValue {
  id: string;
  label: string;
  value: string;
  price: number;
}

export interface NormalizedQuantityTier {
  id: string;
  label: string;
  quantity: number;
  price: number;
}

export interface NormalizedAreaPricingSettings {
  pricePerSqm: number;
  minimumAreaSqm: number;
  widthLabel: string;
  heightLabel: string;
  unitLabel: "cm";
}

export interface NormalizedServicePricingConfig {
  mode: NormalizedServicePricingMode;
  quantityTiers: NormalizedQuantityTier[];
  area: NormalizedAreaPricingSettings | null;
  isCustomQuote: boolean;
}

export interface NormalizedUploadField {
  id: string;
  key: string;
  label: string;
  helperText?: string;
  required: boolean;
  order: number;
  accept: string;
  allowedFileTypesText: string;
  maxFiles: number;
  maxFileSizeMb: number | null;
  allowCustomerFileLabel: boolean;
  source: "service" | "legacy";
}

export interface NormalizedUploadSettings {
  enabled: boolean;
  fields: NormalizedUploadField[];
  slots: number;
  accept: string;
  source: "none" | "legacy" | "service";
}

export interface NormalizedDesignSettings {
  enabled: boolean;
  showCanvas: boolean;
  designerType: string;
  defaultModel: NormalizedDesignModel;
  defaultColor: string;
  availableSizes: readonly string[];
  requiresSizeSelection: boolean;
  allowSecondaryColorPicker: boolean;
}

export interface NormalizedServiceField {
  id: string;
  key: string;
  label: string;
  kind: NormalizedFieldKind;
  source: "option" | "legacy";
  sourceOptionId?: string;
  required: boolean;
  order: number;
  pricingMode: NormalizedPricingMode;
  values: NormalizedOptionValue[];
  helperText?: string;
  defaultValueId?: string;
  placeholder?: string;
  accept?: string;
}

export interface NormalizedServiceConfig {
  serviceId: string;
  basePrice: number;
  pricing: NormalizedServicePricingConfig;
  fields: NormalizedServiceField[];
  uploadSettings: NormalizedUploadSettings;
  designSettings: NormalizedDesignSettings;
  legacyFallbacks: string[];
}

export interface NormalizedAreaInput {
  widthCm?: number | string | null;
  heightCm?: number | string | null;
}

export interface NormalizedPriceResult {
  mode: NormalizedServicePricingMode;
  basePrice: number;
  baseUnitPrice: number;
  quantity: number;
  optionPriceImpact: number;
  overridePrice: number | null;
  usesBaseOverride: boolean;
  selectedTierId: string | null;
  selectedTierLabel: string | null;
  selectedTierQuantity: number | null;
  widthCm: number;
  heightCm: number;
  areaSqm: number;
  billableAreaSqm: number;
  pricePerSqm: number;
  isQuoteOnly: boolean;
  total: number;
}

export type NormalizedValueSelection = Record<string, string | undefined>;
