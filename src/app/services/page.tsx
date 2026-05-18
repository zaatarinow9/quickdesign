import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const revalidate = 60;

type ServiceCatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  basePrice: number;
  pricingMode: string | null;
  configJson: string | null;
};

type ServicePricingMode =
  | "fixed"
  | "quantity_tiers"
  | "area"
  | "option_based"
  | "custom_quote";

type ParsedQuantityTier = {
  price: number;
};

type ParsedAreaConfig = {
  pricePerSqm: number;
};

type ParsedServiceConfig = {
  quantityTiers: ParsedQuantityTier[];
  area: ParsedAreaConfig | null;
};

type ServiceCardPricing = {
  label: string;
  ctaLabel: string;
  badgeLabel: string;
};

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1600&auto=format&fit=crop";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function parsePricingMode(
  value: string | null | undefined,
): ServicePricingMode | null {
  switch (value) {
    case "fixed":
    case "quantity_tiers":
    case "area":
    case "option_based":
    case "custom_quote":
      return value;
    default:
      return null;
  }
}

function parseQuantityTiers(
  source: Record<string, unknown>,
): ParsedQuantityTier[] {
  const rawTiers = source.quantityTiers;

  if (!Array.isArray(rawTiers)) {
    return [];
  }

  return rawTiers
    .map((tier) => {
      if (!isRecord(tier)) {
        return null;
      }

      const price = normalizeNumber(tier.price);
      if (price === null || price < 0) {
        return null;
      }

      return { price };
    })
    .filter((tier): tier is ParsedQuantityTier => tier !== null);
}

function parseAreaConfig(
  source: Record<string, unknown>,
): ParsedAreaConfig | null {
  const rawArea = source.area;
  const areaSource = isRecord(rawArea) ? rawArea : source;
  const pricePerSqm = normalizeNumber(areaSource.pricePerSqm);

  if (pricePerSqm === null || pricePerSqm <= 0) {
    return null;
  }

  return { pricePerSqm };
}

function parseServiceConfig(
  rawConfigJson: string | null | undefined,
): ParsedServiceConfig | null {
  if (!rawConfigJson) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawConfigJson);

    if (!isRecord(parsedValue)) {
      return null;
    }

    return {
      quantityTiers: parseQuantityTiers(parsedValue),
      area: parseAreaConfig(parsedValue),
    };
  } catch {
    return null;
  }
}

function inferPricingMode(
  explicitMode: ServicePricingMode | null,
  parsedConfig: ParsedServiceConfig | null,
): ServicePricingMode {
  if (explicitMode) {
    return explicitMode;
  }

  if (parsedConfig?.area) {
    return "area";
  }

  if (parsedConfig?.quantityTiers.length) {
    return "quantity_tiers";
  }

  return "fixed";
}

function getLowestTierPrice(
  quantityTiers: ParsedQuantityTier[],
): number | null {
  if (quantityTiers.length === 0) {
    return null;
  }

  return quantityTiers.reduce<number>(
    (lowestPrice, tier) => Math.min(lowestPrice, tier.price),
    quantityTiers[0]!.price,
  );
}

function formatPrice(value: number): string {
  return currencyFormatter.format(Math.max(0, value));
}

function buildPricingDisplay(
  service: ServiceCatalogItem,
): ServiceCardPricing {
  const parsedConfig = parseServiceConfig(service.configJson);
  const explicitPricingMode = parsePricingMode(service.pricingMode);
  const pricingMode = inferPricingMode(explicitPricingMode, parsedConfig);

  if (pricingMode === "custom_quote") {
    return {
      label: "Preis auf Anfrage",
      ctaLabel: "Anfragen",
      badgeLabel: "Individuelles Angebot",
    };
  }

  if (pricingMode === "area") {
    const pricePerSqm = parsedConfig?.area?.pricePerSqm;

    if (typeof pricePerSqm === "number" && pricePerSqm > 0) {
      return {
        label: `ab ${formatPrice(pricePerSqm)} / m2`,
        ctaLabel: "Konfigurieren",
        badgeLabel: "Flaechenpreis",
      };
    }
  }

  if (pricingMode === "quantity_tiers") {
    const lowestTierPrice = getLowestTierPrice(
      parsedConfig?.quantityTiers ?? [],
    );

    if (typeof lowestTierPrice === "number") {
      return {
        label: `ab ${formatPrice(lowestTierPrice)}`,
        ctaLabel: "Konfigurieren",
        badgeLabel: "Mengenstaffel",
      };
    }
  }

  return {
    label: `ab ${formatPrice(service.basePrice)}`,
    ctaLabel: "Konfigurieren",
    badgeLabel:
      pricingMode === "option_based" ? "Konfigurierbarer Preis" : "Startpreis",
  };
}

function getShortDescription(description: string): string {
  const normalizedDescription = description.replace(/\s+/g, " ").trim();

  if (normalizedDescription.length <= 138) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 135).trimEnd()}...`;
}

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      basePrice: true,
      pricingMode: true,
      configJson: true,
    },
  });

  const catalogServices: ServiceCatalogItem[] = services;

  return (
    <div className="min-h-screen w-full bg-neutral-50 pt-20 pb-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="mx-auto mb-16 max-w-3xl text-center md:mb-20">
          <span className="mb-4 block text-xs font-bold uppercase tracking-[0.28em] text-neutral-500">
            Unser Sortiment
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-950 md:text-6xl">
            Leistungen fuer Druck, Werbetechnik und digitale Auftritte
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-neutral-600 md:text-base">
            Konfigurieren Sie unsere wichtigsten Leistungen direkt online oder
            senden Sie uns eine Anfrage fuer individuell kalkulierte Projekte.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {catalogServices.map((service) => {
            const pricing = buildPricingDisplay(service);

            return (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="group relative block min-h-[460px] overflow-hidden rounded-[28px] bg-neutral-200 shadow-sm transition-transform duration-500 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/35 to-transparent z-10" />
                <img
                  src={service.image || IMAGE_FALLBACK}
                  alt={service.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <div className="absolute left-0 top-0 z-20 flex w-full items-start justify-between p-6">
                  <span className="rounded-full bg-white/94 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-950 shadow-lg">
                    {pricing.badgeLabel}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 z-20 w-full p-5 md:p-6">
                  <div className="rounded-[24px] bg-white/95 p-6 shadow-2xl backdrop-blur-md">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-neutral-500">
                      {pricing.label}
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                      {service.name}
                    </h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                      {getShortDescription(service.description)}
                    </p>
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-neutral-950 transition-colors group-hover:text-neutral-600">
                        {pricing.ctaLabel}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {catalogServices.length === 0 && (
            <div className="col-span-full rounded-[28px] border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-neutral-500">
                Derzeit sind keine Leistungen verfuegbar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
