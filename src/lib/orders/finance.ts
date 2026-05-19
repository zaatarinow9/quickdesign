export const DEFAULT_ORDER_CURRENCY = "EUR";
export const DEFAULT_GERMAN_TAX_RATE = 19;

export const DISCOUNT_TYPES = ["NONE", "PERCENTAGE", "FIXED"] as const;
export const PAYMENT_STATUSES = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
] as const;
export const DOCUMENT_TYPES = ["ORDER", "OFFER", "INVOICE"] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type OrderFinancials = {
  subtotalNet: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalNet: number;
  totalGross: number;
  currency: string;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeNonNegativeNumber(
  value: number | null | undefined,
  fallback = 0,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, roundCurrency(value))
    : fallback;
}

export function normalizeCurrency(value: string | null | undefined): string {
  const normalizedValue = value?.trim().toUpperCase();
  return normalizedValue || DEFAULT_ORDER_CURRENCY;
}

export function normalizeDiscountType(
  value: string | null | undefined,
): DiscountType {
  switch (value) {
    case "PERCENTAGE":
    case "FIXED":
    case "NONE":
      return value;
    default:
      return "NONE";
  }
}

export function normalizePaymentStatus(
  value: string | null | undefined,
): PaymentStatus {
  switch (value) {
    case "PARTIALLY_PAID":
    case "PAID":
    case "REFUNDED":
    case "UNPAID":
      return value;
    default:
      return "UNPAID";
  }
}

export function getOrderPaymentStatus(source: {
  paymentStatus?: string | null;
  status?: string | null;
}): PaymentStatus {
  if (source.paymentStatus) {
    return normalizePaymentStatus(source.paymentStatus);
  }

  return source.status === "PAID" ? "PAID" : "UNPAID";
}

export function normalizeDocumentType(
  value: string | null | undefined,
): DocumentType {
  switch (value) {
    case "OFFER":
    case "INVOICE":
    case "ORDER":
      return value;
    default:
      return "ORDER";
  }
}

export function normalizeTaxRate(
  value: number | null | undefined,
  fallback = DEFAULT_GERMAN_TAX_RATE,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, roundCurrency(value))
    : fallback;
}

export function calculateOrderFinancials(input: {
  subtotalNet: number;
  discountType?: string | null;
  discountValue?: number | null;
  taxRate?: number | null;
  currency?: string | null;
}): OrderFinancials {
  const subtotalNet = normalizeNonNegativeNumber(input.subtotalNet);
  const discountType = normalizeDiscountType(input.discountType);
  const rawDiscountValue = normalizeNonNegativeNumber(input.discountValue);
  const taxRate = normalizeTaxRate(input.taxRate);
  const currency = normalizeCurrency(input.currency);

  const unclampedDiscountAmount =
    discountType === "PERCENTAGE"
      ? roundCurrency((subtotalNet * rawDiscountValue) / 100)
      : discountType === "FIXED"
        ? rawDiscountValue
        : 0;
  const discountAmount = Math.min(
    subtotalNet,
    normalizeNonNegativeNumber(unclampedDiscountAmount),
  );
  const totalNet = Math.max(0, roundCurrency(subtotalNet - discountAmount));
  const taxAmount = roundCurrency((totalNet * taxRate) / 100);
  const totalGross = roundCurrency(totalNet + taxAmount);

  return {
    subtotalNet,
    discountType,
    discountValue: rawDiscountValue,
    discountAmount,
    taxRate,
    taxAmount,
    totalNet,
    totalGross,
    currency,
  };
}

export function getOrderFinancials(source: {
  totalAmount: number;
  subtotalNet?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  discountAmount?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  totalNet?: number | null;
  totalGross?: number | null;
  currency?: string | null;
}): OrderFinancials {
  const hasStoredFinancials =
    typeof source.subtotalNet === "number" ||
    typeof source.totalNet === "number" ||
    typeof source.totalGross === "number";

  if (!hasStoredFinancials) {
    const fallbackTotal = normalizeNonNegativeNumber(source.totalAmount);

    return {
      subtotalNet: fallbackTotal,
      discountType: "NONE",
      discountValue: 0,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalNet: fallbackTotal,
      totalGross: fallbackTotal,
      currency: normalizeCurrency(source.currency),
    };
  }

  const calculated = calculateOrderFinancials({
    subtotalNet: normalizeNonNegativeNumber(
      source.subtotalNet,
      normalizeNonNegativeNumber(source.totalAmount),
    ),
    discountType: source.discountType,
    discountValue: source.discountValue,
    taxRate: source.taxRate,
    currency: source.currency,
  });

  return {
    ...calculated,
    discountAmount: normalizeNonNegativeNumber(
      source.discountAmount,
      calculated.discountAmount,
    ),
    taxAmount: normalizeNonNegativeNumber(source.taxAmount, calculated.taxAmount),
    totalNet: normalizeNonNegativeNumber(source.totalNet, calculated.totalNet),
    totalGross: normalizeNonNegativeNumber(
      source.totalGross,
      calculated.totalGross,
    ),
  };
}

export function formatCurrencyAmount(
  value: number,
  currency = DEFAULT_ORDER_CURRENCY,
): string {
  return `${normalizeNonNegativeNumber(value).toFixed(2)} ${normalizeCurrency(currency)}`;
}
