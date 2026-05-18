"use client";

import { useState } from "react";
import {
  ArrowRight,
  FileUp,
  Layers3,
  Palette,
  Ruler,
} from "lucide-react";
import TshirtDesigner from "./TshirtDesigner";
import ServiceConfigurator from "./ServiceConfigurator";
import { FullDesignData } from "@/lib/store/cart";
import type {
  NormalizedServiceConfig,
  NormalizedServicePricingMode,
} from "@/lib/services/configuration/types";

type ServiceWorkspaceService = {
  id: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
};

type PricingHeroContent = {
  value: string;
  badge: string;
  note: string;
};

interface Props {
  service: ServiceWorkspaceService;
  config: NormalizedServiceConfig;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.max(0, value));
}

function getLowestTierPrice(config: NormalizedServiceConfig): number | null {
  if (config.pricing.quantityTiers.length === 0) {
    return null;
  }

  return config.pricing.quantityTiers.reduce<number>(
    (lowestPrice, tier) => Math.min(lowestPrice, tier.price),
    config.pricing.quantityTiers[0]!.price,
  );
}

function getPricingModeLabel(mode: NormalizedServicePricingMode): string {
  switch (mode) {
    case "quantity_tiers":
      return "Mengenstaffel";
    case "area":
      return "Flaechenpreis";
    case "option_based":
      return "Konfigurierbarer Preis";
    case "custom_quote":
      return "Anfrageleistung";
    case "fixed":
    default:
      return "Festpreis";
  }
}

function buildHeroPricingContent(
  config: NormalizedServiceConfig,
  service: ServiceWorkspaceService,
): PricingHeroContent {
  if (config.pricing.mode === "custom_quote") {
    return {
      value: "Preis auf Anfrage",
      badge: "Individuelles Angebot",
      note: "Diese Leistung wird auf Basis Ihrer Angaben individuell kalkuliert.",
    };
  }

  if (config.pricing.mode === "area" && config.pricing.area) {
    return {
      value: `ab ${formatCurrency(config.pricing.area.pricePerSqm)} / m2`,
      badge: "Preis pro Quadratmeter",
      note: "Breite, Hoehe und eventuelle Aufpreise werden live eingerechnet.",
    };
  }

  if (config.pricing.mode === "quantity_tiers") {
    const lowestTierPrice = getLowestTierPrice(config);

    if (lowestTierPrice !== null) {
      return {
        value: `ab ${formatCurrency(lowestTierPrice)}`,
        badge: "Staffelpreis",
        note: "Waehlen Sie zuerst die passende Auflage, danach werden Zusatzoptionen ergaenzt.",
      };
    }
  }

  return {
    value: `ab ${formatCurrency(service.basePrice)}`,
    badge:
      config.pricing.mode === "option_based"
        ? "Startpreis plus Optionen"
        : "Startpreis",
    note: "Der Gesamtpreis aktualisiert sich live waehrend Ihrer Konfiguration.",
  };
}

function getSummaryFacts(config: NormalizedServiceConfig): Array<{
  label: string;
  value: string;
}> {
  return [
    {
      label: "Preismodell",
      value: getPricingModeLabel(config.pricing.mode),
    },
    {
      label: "Konfigurationsfelder",
      value: `${config.fields.length}`,
    },
    {
      label: "Uploadfelder",
      value: config.uploadSettings.enabled
        ? `${config.uploadSettings.fields.length}`
        : "Keine",
    },
  ];
}

function getConfiguratorHighlights(config: NormalizedServiceConfig): string[] {
  const highlights = [
    "Alle Preise werden live berechnet.",
    "Datei-Uploads und Zusatzangaben bleiben voll kompatibel.",
  ];

  if (config.pricing.mode === "area") {
    highlights.push("Breite, Hoehe und berechnete Flaeche werden sofort angezeigt.");
  }

  if (config.pricing.mode === "quantity_tiers") {
    highlights.push("Mengenstaffeln werden klar ausgewaehlt und sauber zusammengefasst.");
  }

  if (config.uploadSettings.enabled) {
    highlights.push("Uploadfelder zeigen Formate, Dateianzahl und maximale Groesse an.");
  }

  return highlights.slice(0, 3);
}

export default function ServiceWorkspace({ service, config }: Props) {
  const [designData, setDesignData] = useState<FullDesignData>(() => ({
    model: config.designSettings.defaultModel,
    color: config.designSettings.defaultColor,
    frontLogos: [],
    backLogos: [],
  }));

  const pricingContent = buildHeroPricingContent(config, service);
  const summaryFacts = getSummaryFacts(config);
  const configuratorHighlights = getConfiguratorHighlights(config);

  return (
    <div className="space-y-8 py-8 md:space-y-10 md:py-10">
      <section className="overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8 p-8 md:p-10 xl:p-12">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-600">
                Leistung konfigurieren <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-neutral-950 md:text-5xl xl:text-6xl">
                {service.name}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-neutral-600 md:text-base">
                {service.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-neutral-950 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
                {pricingContent.badge}
              </span>
              <span className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-600">
                {getPricingModeLabel(config.pricing.mode)}
              </span>
              {config.uploadSettings.enabled && (
                <span className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-600">
                  {config.uploadSettings.fields.length} Uploadfelder
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="rounded-[24px] bg-neutral-950 p-6 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-300">
                  Preisueberblick
                </p>
                <p className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                  {pricingContent.value}
                </p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-300">
                  {pricingContent.note}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                {summaryFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                      {fact.label}
                    </p>
                    <p className="mt-3 text-lg font-bold tracking-tight text-neutral-950">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[320px] border-t border-neutral-200 bg-neutral-100 p-6 lg:min-h-full lg:border-l lg:border-t-0 lg:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-950/8 via-transparent to-transparent" />
            <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[28px] bg-white/70 p-6 shadow-inner backdrop-blur-sm">
              <img
                src={service.image}
                alt={service.name}
                className="h-full w-full object-contain transition-transform duration-700 hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-8">
          <section className="overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-5 md:px-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                  Produktansicht
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">
                  {config.designSettings.showCanvas
                    ? "Live-Vorschau und Gestaltung"
                    : "Leistungsvisualisierung"}
                </h2>
              </div>
              {config.designSettings.showCanvas && (
                <span className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-600">
                  Interaktiv
                </span>
              )}
            </div>

            <div className="p-5 md:p-8">
              {config.designSettings.showCanvas ? (
                <div className="animate-in fade-in zoom-in-95 duration-700">
                  <TshirtDesigner
                    designData={designData}
                    setDesignData={setDesignData}
                  />
                </div>
              ) : (
                <div className="group flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[28px] border border-neutral-100 bg-neutral-50 p-8 shadow-inner">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-neutral-950">
                <Layers3 className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                  Konfiguration
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                Varianten, Preislogik und Eingabefelder sind direkt in der
                rechten Spalte strukturiert zusammengefasst.
              </p>
            </div>

            <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-neutral-950">
                {config.pricing.mode === "area" ? (
                  <Ruler className="h-4 w-4" />
                ) : (
                  <Palette className="h-4 w-4" />
                )}
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                  Preislogik
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                {config.pricing.mode === "custom_quote"
                  ? "Diese Leistung wird als Anfrageprodukt vorbereitet und nicht mit einem irrefuehrenden 0-Euro-Preis dargestellt."
                  : config.pricing.mode === "area"
                    ? "Breite, Hoehe, Mindestflaeche und Aufpreise bleiben transparent sichtbar."
                    : "Der Preis bleibt waehrend der Konfiguration live nachvollziehbar."}
              </p>
            </div>

            <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-neutral-950">
                <FileUp className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                  Projektdateien
                </p>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-neutral-600">
                {configuratorHighlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div className="w-full">
          <ServiceConfigurator
            service={service}
            config={config}
            designData={designData}
            setDesignData={setDesignData}
          />
        </div>
      </div>
    </div>
  );
}
