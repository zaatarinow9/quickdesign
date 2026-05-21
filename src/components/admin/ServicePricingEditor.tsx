"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash } from "lucide-react";

type ServicePricingModeSelection =
  | "fixed"
  | "quantity_tiers"
  | "area"
  | "option_based"
  | "custom_quote";

type QuantityTierRow = {
  id: string;
  label: string;
  quantity: string;
  price: string;
};

type AreaPricingState = {
  pricePerSqm: string;
  minimumAreaSqm: string;
  widthLabel: string;
  heightLabel: string;
};

type PricingConfigPayload = {
  quantityTiers?: {
    label: string;
    quantity: number;
    price: number;
  }[];
  area?: {
    pricePerSqm: number;
    minimumAreaSqm: number;
    widthLabel: string;
    heightLabel: string;
  };
};

interface Props {
  initialPricingMode?: string | null;
  initialConfigJson?: string | null;
  onPreviewChange?: (preview: ServicePricingPreview) => void;
}

export type ServicePricingPreview = {
  mode: ServicePricingModeSelection;
  modeLabel: string;
  summaryLines: string[];
};

const PRICING_MODE_OPTIONS: {
  value: ServicePricingModeSelection;
  label: string;
  description: string;
}[] = [
  {
    value: "fixed",
    label: "Festpreis",
    description: "Grundpreis plus optionale Aufpreise aus ausgewaehlten Feldwerten.",
  },
  {
    value: "quantity_tiers",
    label: "Mengenstaffeln",
    description: "Jede Staffel definiert eine feste Menge und den dazugehoerigen Preis.",
  },
  {
    value: "area",
    label: "Flaechenpreis",
    description: "Preis pro Quadratmeter mit Eingabe von Breite und Hoehe in Zentimetern.",
  },
  {
    value: "option_based",
    label: "Optionsbasiert",
    description: "Grundpreis plus feste Preisaufschlaege aus Optionswerten.",
  },
  {
    value: "custom_quote",
    label: "Preis auf Anfrage",
    description: "Es wird kein automatischer Preis berechnet.",
  },
] as const;

function createTierId(seed: number): string {
  return `tier-${seed}`;
}

function createEmptyTier(seed: number): QuantityTierRow {
  return {
    id: createTierId(seed),
    label: "",
    quantity: String(seed),
    price: "0.00",
  };
}

function normalizePricingMode(
  value: string | null | undefined,
): ServicePricingModeSelection {
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

function normalizeOptionalString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function parsePositiveInteger(value: unknown): number | null {
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

function parseInitialConfigJson(
  initialConfigJson: string | null | undefined,
): PricingConfigPayload {
  if (!initialConfigJson) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(initialConfigJson);
    if (!isRecord(parsedValue)) {
      return {};
    }

    const payload: PricingConfigPayload = {};

    if (Array.isArray(parsedValue.quantityTiers)) {
      payload.quantityTiers = parsedValue.quantityTiers
        .map((tier) => {
          if (!isRecord(tier)) {
            return null;
          }

          const quantity = parsePositiveInteger(tier.quantity);
          const price = parseFiniteNumber(tier.price);

          if (quantity === null || price === null) {
            return null;
          }

          return {
            label:
              normalizeOptionalString(
                typeof tier.label === "string" ? tier.label : "",
              ) || `${quantity} Stueck`,
            quantity,
            price,
          };
        })
        .filter(
          (
            tier,
          ): tier is {
            label: string;
            quantity: number;
            price: number;
          } => tier !== null,
        );
    }

    if (isRecord(parsedValue.area)) {
      payload.area = {
        pricePerSqm: Math.max(
          0,
          parseFiniteNumber(parsedValue.area.pricePerSqm) ?? 0,
        ),
        minimumAreaSqm: Math.max(
          0,
          parseFiniteNumber(parsedValue.area.minimumAreaSqm) ?? 0,
        ),
        widthLabel:
          normalizeOptionalString(
            typeof parsedValue.area.widthLabel === "string"
              ? parsedValue.area.widthLabel
              : "",
          ) || "Breite (cm)",
        heightLabel:
          normalizeOptionalString(
            typeof parsedValue.area.heightLabel === "string"
              ? parsedValue.area.heightLabel
              : "",
          ) || "Hoehe (cm)",
      };
    }

    return payload;
  } catch {
    return {};
  }
}

function buildInitialTierRows(config: PricingConfigPayload): QuantityTierRow[] {
  if (!Array.isArray(config.quantityTiers) || config.quantityTiers.length === 0) {
    return [createEmptyTier(1)];
  }

  const normalizedRows = config.quantityTiers.map((tier, index) => {
    const quantity = parsePositiveInteger(tier.quantity) ?? index + 1;
    const price = parseFiniteNumber(tier.price) ?? 0;

    return {
      id: createTierId(index + 1),
      label: normalizeOptionalString(tier.label),
      quantity: String(quantity),
      price: price.toFixed(2),
    };
  });

  return normalizedRows.length > 0 ? normalizedRows : [createEmptyTier(1)];
}

function buildInitialAreaState(config: PricingConfigPayload): AreaPricingState {
  const areaConfig = isRecord(config.area) ? config.area : null;
  const pricePerSqm = parseFiniteNumber(areaConfig?.pricePerSqm) ?? 0;
  const minimumAreaSqm = parseFiniteNumber(areaConfig?.minimumAreaSqm) ?? 0;

  return {
    pricePerSqm: pricePerSqm > 0 ? pricePerSqm.toFixed(2) : "",
    minimumAreaSqm:
      minimumAreaSqm > 0 ? minimumAreaSqm.toFixed(2) : "0",
    widthLabel:
      normalizeOptionalString(
        typeof areaConfig?.widthLabel === "string"
          ? areaConfig.widthLabel
          : "",
      ) || "Breite (cm)",
    heightLabel:
      normalizeOptionalString(
        typeof areaConfig?.heightLabel === "string"
          ? areaConfig.heightLabel
          : "",
      ) || "Hoehe (cm)",
  };
}

function buildPricingConfigJson(
  pricingMode: ServicePricingModeSelection,
  quantityTiers: QuantityTierRow[],
  areaState: AreaPricingState,
): string {
  const payload: PricingConfigPayload = {};

  if (pricingMode === "quantity_tiers") {
    payload.quantityTiers = quantityTiers
      .map((tier) => {
        const quantity = parsePositiveInteger(tier.quantity);
        const price = parseFiniteNumber(tier.price);

        if (quantity === null || price === null || price < 0) {
          return null;
        }

        return {
          label: normalizeOptionalString(tier.label) || `${quantity} Stueck`,
          quantity,
          price,
        };
      })
      .filter(
        (
          tier,
        ): tier is {
          label: string;
          quantity: number;
          price: number;
        } => tier !== null,
      );
  }

  if (pricingMode === "area") {
    payload.area = {
      pricePerSqm: Math.max(0, parseFiniteNumber(areaState.pricePerSqm) ?? 0),
      minimumAreaSqm: Math.max(
        0,
        parseFiniteNumber(areaState.minimumAreaSqm) ?? 0,
      ),
      widthLabel: normalizeOptionalString(areaState.widthLabel) || "Breite (cm)",
      heightLabel: normalizeOptionalString(areaState.heightLabel) || "Hoehe (cm)",
    };
  }

  return JSON.stringify(payload);
}

function buildPricingPreview(
  pricingMode: ServicePricingModeSelection,
  quantityTiers: QuantityTierRow[],
  areaState: AreaPricingState,
): ServicePricingPreview {
  const selectedModeConfig =
    PRICING_MODE_OPTIONS.find((option) => option.value === pricingMode) ??
    PRICING_MODE_OPTIONS[0]!;
  const summaryLines: string[] = [];

  switch (pricingMode) {
    case "quantity_tiers": {
      const configuredTiers = quantityTiers.filter(
        (tier) => tier.label.trim() !== "",
      );

      summaryLines.push(
        configuredTiers.length === 0
          ? "Noch keine Staffel definiert."
          : `${configuredTiers.length} Mengenstaffeln konfiguriert.`,
      );

      if (configuredTiers[0]?.label) {
        summaryLines.push(`Startet mit: ${configuredTiers[0].label}`);
      }
      break;
    }
    case "area":
      summaryLines.push(
        `Preis pro m2: ${
          areaState.pricePerSqm.trim() !== "" ? areaState.pricePerSqm : "0.00"
        } EUR`,
      );
      summaryLines.push(
        `Felder: ${areaState.widthLabel || "Breite (cm)"} / ${
          areaState.heightLabel || "Hoehe (cm)"
        }`,
      );
      break;
    case "custom_quote":
      summaryLines.push("Der Service bleibt im Checkout als Anfrage markiert.");
      summaryLines.push("Es wird kein automatischer Preis berechnet.");
      break;
    case "option_based":
      summaryLines.push("Aufpreise werden aus Kundenoptionen addiert.");
      summaryLines.push("Der Grundpreis bleibt als Basis erhalten.");
      break;
    case "fixed":
    default:
      summaryLines.push("Der Grundpreis wird direkt als Basis verwendet.");
      summaryLines.push("Optionale Zusatzpreise bleiben moeglich.");
      break;
  }

  return {
    mode: pricingMode,
    modeLabel: selectedModeConfig.label,
    summaryLines,
  };
}

export default function ServicePricingEditor({
  initialPricingMode,
  initialConfigJson,
  onPreviewChange,
}: Props) {
  const initialConfig = useMemo(
    () => parseInitialConfigJson(initialConfigJson),
    [initialConfigJson],
  );
  const [pricingMode, setPricingMode] = useState<ServicePricingModeSelection>(
    () => normalizePricingMode(initialPricingMode),
  );
  const [quantityTiers, setQuantityTiers] = useState<QuantityTierRow[]>(() =>
    buildInitialTierRows(initialConfig),
  );
  const [areaState, setAreaState] = useState<AreaPricingState>(() =>
    buildInitialAreaState(initialConfig),
  );

  const selectedModeConfig =
    PRICING_MODE_OPTIONS.find((option) => option.value === pricingMode) ??
    PRICING_MODE_OPTIONS[0]!;
  const pricingConfigJson = useMemo(
    () => buildPricingConfigJson(pricingMode, quantityTiers, areaState),
    [areaState, pricingMode, quantityTiers],
  );
  const pricingPreview = useMemo(
    () => buildPricingPreview(pricingMode, quantityTiers, areaState),
    [areaState, pricingMode, quantityTiers],
  );

  useEffect(() => {
    onPreviewChange?.(pricingPreview);
  }, [onPreviewChange, pricingPreview]);

  const addTierRow = () => {
    setQuantityTiers((current) => [
      ...current,
      createEmptyTier(current.length + 1),
    ]);
  };

  const removeTierRow = (tierId: string) => {
    setQuantityTiers((current) => {
      if (current.length === 1) {
        return [createEmptyTier(1)];
      }

      return current.filter((tier) => tier.id !== tierId);
    });
  };

  const updateTierRow = (
    tierId: string,
    field: keyof Omit<QuantityTierRow, "id">,
    value: string,
  ) => {
    setQuantityTiers((current) =>
      current.map((tier) =>
        tier.id === tierId ? { ...tier, [field]: value } : tier,
      ),
    );
  };

  return (
    <section className="space-y-8">
      <input type="hidden" name="pricingMode" value={pricingMode} />
      <input type="hidden" name="pricingConfigJson" value={pricingConfigJson} />

      <div className="pb-4 border-b border-neutral-100">
        <h2 className="text-sm font-bold text-neutral-950 uppercase tracking-widest">
          Wie wird der Preis berechnet?
        </h2>
        <p className="text-sm text-neutral-500 mt-2">
          Waehlt aus, wie der oeffentliche Preis berechnet wird, ohne die bestehende
          Checkout- und Order-Architektur anzutasten.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
            Zusammenfassung
          </p>
          <p className="mt-3 text-lg font-bold text-slate-950">
            {pricingPreview.modeLabel}
          </p>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 md:col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
            Kurzfassung
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pricingPreview.summaryLines.map((line) => (
              <span
                key={line}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-700"
              >
                {line}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
          Preismodell
        </label>
        <select
          name="pricingModeDisplay"
          value={pricingMode}
          onChange={(event) =>
            setPricingMode(
              normalizePricingMode(event.target.value),
            )
          }
          className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
        >
          {PRICING_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-neutral-500 mt-3">
          {selectedModeConfig.description}
        </p>
      </div>

      {(pricingMode === "fixed" || pricingMode === "option_based") && (
        <div className="border border-dashed border-neutral-300 px-4 py-4 text-sm text-neutral-500 bg-white">
          Dieses Modell verwendet den vorhandenen Grundpreis. Aufpreise aus
          Optionswerten bleiben weiterhin aktiv.
        </div>
      )}

      {pricingMode === "custom_quote" && (
        <div className="border border-dashed border-neutral-300 px-4 py-4 text-sm text-neutral-500 bg-white">
          Im Store wird kein berechneter Preis angezeigt. Phase 3B markiert die
          Leistung nur als Anfrage-Produkt; ein vollstaendiger Angebots-Workflow
          folgt nicht in diesem Schritt.
        </div>
      )}

      {pricingMode === "quantity_tiers" && (
        <div className="space-y-6 bg-white border border-neutral-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                Mengenstaffeln
              </h3>
              <p className="text-sm text-neutral-500 mt-2">
                Jede Staffel definiert eine Menge und einen festen Preis pro Set.
              </p>
            </div>
            <button
              type="button"
              onClick={addTierRow}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-950 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Staffel hinzufuegen
            </button>
          </div>

          <div className="space-y-4">
            {quantityTiers.map((tier) => (
              <div
                key={tier.id}
                className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_140px_140px_52px] gap-4 items-center"
              >
                <input
                  type="text"
                  value={tier.label}
                  onChange={(event) =>
                    updateTierRow(tier.id, "label", event.target.value)
                  }
                  placeholder="z. B. 1000 Stueck"
                  required={pricingMode === "quantity_tiers"}
                  className="border border-neutral-300 p-3 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={tier.quantity}
                  onChange={(event) =>
                    updateTierRow(tier.id, "quantity", event.target.value)
                  }
                  placeholder="Menge"
                  required={pricingMode === "quantity_tiers"}
                  className="border border-neutral-300 p-3 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                />
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tier.price}
                    onChange={(event) =>
                      updateTierRow(tier.id, "price", event.target.value)
                    }
                    placeholder="0.00"
                    required={pricingMode === "quantity_tiers"}
                    className="w-full border border-neutral-300 p-3 pr-12 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-xs">
                    EUR
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTierRow(tier.id)}
                  className="p-3 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pricingMode === "area" && (
        <div className="space-y-6 bg-white border border-neutral-200 p-6">
          <div>
            <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
              Flaechenberechnung
            </h3>
            <p className="text-sm text-neutral-500 mt-2">
              Formel im Store: Flaeche m2 = (Breite cm / 100) x (Hoehe cm / 100).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Preis pro m2
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={areaState.pricePerSqm}
                onChange={(event) =>
                  setAreaState((current) => ({
                    ...current,
                    pricePerSqm: event.target.value,
                  }))
                }
                required={pricingMode === "area"}
                className="w-full border border-neutral-300 p-4 pr-14 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
              />
              <span className="absolute right-4 top-[49px] text-neutral-500 font-bold text-xs">
                EUR
              </span>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Mindestfläche (m2)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={areaState.minimumAreaSqm}
                onChange={(event) =>
                  setAreaState((current) => ({
                    ...current,
                    minimumAreaSqm: event.target.value,
                  }))
                }
                className="w-full border border-neutral-300 p-4 pr-14 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
              />
              <span className="absolute right-4 top-[49px] text-neutral-500 font-bold text-xs">
                m2
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Label Breite
              </label>
              <input
                type="text"
                value={areaState.widthLabel}
                onChange={(event) =>
                  setAreaState((current) => ({
                    ...current,
                    widthLabel: event.target.value,
                  }))
                }
                required={pricingMode === "area"}
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Label Hoehe
              </label>
              <input
                type="text"
                value={areaState.heightLabel}
                onChange={(event) =>
                  setAreaState((current) => ({
                    ...current,
                    heightLabel: event.target.value,
                  }))
                }
                required={pricingMode === "area"}
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

