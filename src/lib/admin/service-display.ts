import type {
  NormalizedServiceConfig,
  NormalizedServicePricingMode,
} from "@/lib/services/configuration/types";

type ServiceVisibilityMeta = {
  label: string;
  badgeClassName: string;
};

type ServicePricingModeMeta = {
  label: string;
  description: string;
  badgeClassName: string;
};

export function normalizeServicePricingModeValue(
  value: string | null | undefined,
): NormalizedServicePricingMode {
  switch (value) {
    case "quantity_tiers":
    case "area":
    case "option_based":
    case "custom_quote":
    case "fixed":
      return value;
    default:
      return "fixed";
  }
}

export function getServiceVisibilityMeta(isActive: boolean): ServiceVisibilityMeta {
  return isActive
    ? {
        label: "Aktiv",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
      }
    : {
        label: "Versteckt",
        badgeClassName: "border border-slate-200 bg-slate-100 text-slate-600",
      };
}

export function getServicePricingModeMeta(
  mode: string | null | undefined,
): ServicePricingModeMeta {
  switch (normalizeServicePricingModeValue(mode)) {
    case "quantity_tiers":
      return {
        label: "Preis pro Stueckzahl",
        description: "Der Preis richtet sich nach festen Mengenstaffeln.",
        badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
      };
    case "area":
      return {
        label: "Preis pro m2",
        description: "Der Preis wird aus Breite, Hoehe und Quadratmeterpreis berechnet.",
        badgeClassName: "border border-indigo-200 bg-indigo-50 text-indigo-700",
      };
    case "option_based":
      return {
        label: "Preis nach Auswahl",
        description: "Grundpreis plus definierte Aufpreise aus Kundenoptionen.",
        badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
      };
    case "custom_quote":
      return {
        label: "Preis auf Anfrage",
        description: "Kein automatischer Checkout-Preis, nur Anfragebasis.",
        badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
      };
    case "fixed":
    default:
      return {
        label: "Festpreis",
        description: "Ein fester Startpreis mit optionalen konfigurierten Aufpreisen.",
        badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      };
  }
}

export function getServiceUploadSummary(
  config: NormalizedServiceConfig,
): {
  label: string;
  hasUploads: boolean;
} {
  const uploadFieldCount =
    config.uploadSettings.fields.length +
    config.fields.filter((field) => field.kind === "file").length;

  if (uploadFieldCount === 0) {
    return {
      label: "Keine Uploads",
      hasUploads: false,
    };
  }

  return {
    label:
      uploadFieldCount === 1
        ? "1 Uploadfeld"
        : `${uploadFieldCount} Uploadfelder`,
    hasUploads: true,
  };
}

export function buildServiceManagementSummary(
  config: NormalizedServiceConfig,
): string {
  const pricingMeta = getServicePricingModeMeta(config.pricing.mode);
  const uploadSummary = getServiceUploadSummary(config);

  if (uploadSummary.hasUploads) {
    return `Dieser Service nutzt ${pricingMeta.label.toLowerCase()} und erwartet ${uploadSummary.label.toLowerCase()}.`;
  }

  return `Dieser Service nutzt ${pricingMeta.label.toLowerCase()} und benoetigt keine zusaetzlichen Kundendateien.`;
}
