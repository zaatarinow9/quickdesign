import type {
  NormalizedAreaInput,
  NormalizedFieldKind,
  NormalizedOptionValue,
  NormalizedPriceResult,
  NormalizedPricingMode,
  NormalizedQuantityTier,
  NormalizedServiceConfig,
  NormalizedServiceField,
  NormalizedValueSelection,
} from "./types";

type OptionPriceImpactResult = {
  amount: number;
  pricingMode: NormalizedPricingMode;
  selectedValue: NormalizedOptionValue | null;
};

type ResolvedTierSelection = {
  tier: NormalizedQuantityTier | null;
  selectedTierId: string | null;
};

function normalizeSafeNumber(
  value: number | null | undefined,
  fallback = 0,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeInputNumber(
  value: number | string | null | undefined,
  fallback = 0,
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  return fallback;
}

function isValueField(
  kind: NormalizedFieldKind,
): kind is "select" | "radio" | "size" {
  return kind === "select" || kind === "radio" || kind === "size";
}

function resolveQuantityTierSelection(
  tiers: NormalizedQuantityTier[],
  selectedTierId: string | null | undefined,
): ResolvedTierSelection {
  if (tiers.length === 0) {
    return {
      tier: null,
      selectedTierId: null,
    };
  }

  const selectedTier =
    tiers.find((tier) => tier.id === selectedTierId) ?? tiers[0] ?? null;

  return {
    tier: selectedTier,
    selectedTierId: selectedTier?.id ?? null,
  };
}

export function calculateOptionPriceImpact(
  field: NormalizedServiceField,
  selectedValueId?: string | null,
): OptionPriceImpactResult {
  if (!isValueField(field.kind) || !selectedValueId) {
    return {
      amount: 0,
      pricingMode: field.pricingMode,
      selectedValue: null,
    };
  }

  const selectedValue =
    field.values.find((value) => value.id === selectedValueId) ?? null;

  if (!selectedValue) {
    return {
      amount: 0,
      pricingMode: field.pricingMode,
      selectedValue: null,
    };
  }

  if (field.pricingMode === "override_base") {
    return {
      amount: normalizeSafeNumber(selectedValue.price),
      pricingMode: field.pricingMode,
      selectedValue,
    };
  }

  if (field.pricingMode === "additive") {
    return {
      amount: normalizeSafeNumber(selectedValue.price),
      pricingMode: field.pricingMode,
      selectedValue,
    };
  }

  return {
    amount: 0,
    pricingMode: field.pricingMode,
    selectedValue,
  };
}

export function calculateServicePrice({
  config,
  selectedValues,
  quantity,
  selectedQuantityTierId,
  area,
}: {
  config: NormalizedServiceConfig;
  selectedValues: NormalizedValueSelection;
  quantity: number;
  selectedQuantityTierId?: string | null;
  area?: NormalizedAreaInput;
}): NormalizedPriceResult {
  const safeQuantity = Math.max(1, normalizeSafeNumber(quantity, 1));
  const basePrice = Math.max(0, normalizeSafeNumber(config.basePrice));
  const widthCm = Math.max(0, normalizeInputNumber(area?.widthCm));
  const heightCm = Math.max(0, normalizeInputNumber(area?.heightCm));
  const areaSqm = normalizeSafeNumber((widthCm / 100) * (heightCm / 100));
  const minimumAreaSqm = Math.max(
    0,
    normalizeSafeNumber(config.pricing.area?.minimumAreaSqm),
  );
  const billableAreaSqm = Math.max(areaSqm, minimumAreaSqm);
  const pricePerSqm = Math.max(
    0,
    normalizeSafeNumber(config.pricing.area?.pricePerSqm),
  );

  let optionPriceImpact = 0;
  let overridePrice: number | null = null;

  for (const field of config.fields) {
    const impact = calculateOptionPriceImpact(field, selectedValues[field.id]);
    const normalizedImpactAmount = normalizeSafeNumber(impact.amount);

    if (impact.pricingMode === "override_base" && impact.selectedValue) {
      // Legacy compatibility: old services may still store quantity-style
      // pricing as an option that overrides the base price.
      overridePrice = normalizedImpactAmount;
      continue;
    }

    if (impact.pricingMode === "additive") {
      optionPriceImpact = normalizeSafeNumber(
        optionPriceImpact + normalizedImpactAmount,
      );
    }
  }

  if (config.pricing.mode === "custom_quote") {
    return {
      mode: config.pricing.mode,
      basePrice,
      baseUnitPrice: 0,
      quantity: safeQuantity,
      optionPriceImpact: 0,
      overridePrice: null,
      usesBaseOverride: false,
      selectedTierId: null,
      selectedTierLabel: null,
      selectedTierQuantity: null,
      widthCm,
      heightCm,
      areaSqm,
      billableAreaSqm,
      pricePerSqm,
      isQuoteOnly: true,
      total: 0,
    };
  }

  if (config.pricing.mode === "quantity_tiers") {
    const tierSelection = resolveQuantityTierSelection(
      config.pricing.quantityTiers,
      selectedQuantityTierId,
    );
    const selectedTier = tierSelection.tier;
    const tierUnitPrice = Math.max(
      0,
      normalizeSafeNumber(selectedTier?.price),
    );
    const total = normalizeSafeNumber(
      (tierUnitPrice + optionPriceImpact) * safeQuantity,
    );

    return {
      mode: config.pricing.mode,
      basePrice,
      baseUnitPrice: tierUnitPrice,
      quantity: safeQuantity,
      optionPriceImpact,
      overridePrice: selectedTier ? tierUnitPrice : null,
      usesBaseOverride: Boolean(selectedTier),
      selectedTierId: tierSelection.selectedTierId,
      selectedTierLabel: selectedTier?.label ?? null,
      selectedTierQuantity: selectedTier?.quantity ?? null,
      widthCm,
      heightCm,
      areaSqm,
      billableAreaSqm,
      pricePerSqm,
      isQuoteOnly: false,
      total,
    };
  }

  if (config.pricing.mode === "area") {
    const areaUnitPrice = normalizeSafeNumber(billableAreaSqm * pricePerSqm);
    const total = normalizeSafeNumber(
      (areaUnitPrice + optionPriceImpact) * safeQuantity,
    );

    return {
      mode: config.pricing.mode,
      basePrice,
      baseUnitPrice: areaUnitPrice,
      quantity: safeQuantity,
      optionPriceImpact,
      overridePrice: null,
      usesBaseOverride: false,
      selectedTierId: null,
      selectedTierLabel: null,
      selectedTierQuantity: null,
      widthCm,
      heightCm,
      areaSqm,
      billableAreaSqm,
      pricePerSqm,
      isQuoteOnly: false,
      total,
    };
  }

  const usesBaseOverride = overridePrice !== null;
  const baseUnitPrice = Math.max(
    0,
    normalizeSafeNumber(usesBaseOverride ? overridePrice : basePrice),
  );
  const total = usesBaseOverride
    ? normalizeSafeNumber(baseUnitPrice + optionPriceImpact)
    : normalizeSafeNumber((baseUnitPrice + optionPriceImpact) * safeQuantity);

  return {
    mode: config.pricing.mode,
    basePrice,
    baseUnitPrice,
    quantity: safeQuantity,
    optionPriceImpact,
    overridePrice,
    usesBaseOverride,
    selectedTierId: null,
    selectedTierLabel: null,
    selectedTierQuantity: null,
    widthCm,
    heightCm,
    areaSqm,
    billableAreaSqm,
    pricePerSqm,
    isQuoteOnly: false,
    total,
  };
}
