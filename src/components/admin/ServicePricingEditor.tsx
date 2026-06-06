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
    minimumAreaSqm: minimumAreaSqm > 0 ? minimumAreaSqm.toFixed(2) : "0",
    widthLabel:
      normalizeOptionalString(
        typeof areaConfig?.widthLabel === "string" ? areaConfig.widthLabel : "",
      ) || "Breite (cm)",
    heightLabel:
      normalizeOptionalString(
        typeof areaConfig?.heightLabel === "string" ? areaConfig.heightLabel : "",
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
      const configuredTiers = quantityTiers.filter((tier) => tier.label.trim() !== "");

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

      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-100">
          Preisgestaltung
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
          Legen Sie fest, wie der Preis berechnet wird, ohne die bestehende
          Checkout- und Order-Logik zu veraendern.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/80 dark:bg-sky-950/40">
          <p className="text-xs font-medium tracking-[0.08em] text-sky-700 dark:text-sky-200">
            Zusammenfassung
          </p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {pricingPreview.modeLabel}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60 md:col-span-2">
          <p className="text-xs font-medium tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Kurzfassung
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pricingPreview.summaryLines.map((line) => (
              <span
                key={line}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {line}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Preismodell
        </label>
        <select
          name="pricingModeDisplay"
          value={pricingMode}
          onChange={(event) =>
            setPricingMode(normalizePricingMode(event.target.value))
          }
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        >
          {PRICING_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300">
          {selectedModeConfig.description}
        </p>
      </div>

      {(pricingMode === "fixed" || pricingMode === "option_based") && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
          Dieses Modell verwendet den vorhandenen Grundpreis. Preisaufschlaege
          aus Kundenoptionen bleiben weiterhin aktiv.
        </div>
      )}

      {pricingMode === "custom_quote" && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
          Im Store wird kein berechneter Preis angezeigt. Die Leistung bleibt in
          diesem Schritt bewusst ein Anfrage-Produkt.
        </div>
      )}

      {pricingMode === "quantity_tiers" && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                Mengenstaffeln
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                Jede Staffel definiert eine Menge und einen festen Preis pro Set.
              </p>
            </div>
            <button
              type="button"
              onClick={addTierRow}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Staffel hinzufuegen
            </button>
          </div>

          <div className="space-y-4">
            {quantityTiers.map((tier) => (
              <div
                key={tier.id}
                className="grid grid-cols-1 items-center gap-4 md:grid-cols-[minmax(0,1.4fr)_140px_140px_56px]"
              >
                <input
                  type="text"
                  value={tier.label}
                  onChange={(event) =>
                    updateTierRow(tier.id, "label", event.target.value)
                  }
                  placeholder="z. B. 1000 Stueck"
                  required={pricingMode === "quantity_tiers"}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 pr-12 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    EUR
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTierRow(tier.id)}
                  className="rounded-2xl p-3 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  aria-label={`Staffel ${tier.label || tier.quantity} entfernen`}
                >
                  <Trash className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pricingMode === "area" && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              Flaechenberechnung
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
              Formel im Store: Flaeche m2 = (Breite cm / 100) x (Hoehe cm / 100).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="relative">
              <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pr-14 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
              <span className="absolute right-4 top-[49px] text-xs font-semibold text-slate-500 dark:text-slate-400">
                EUR
              </span>
            </div>

            <div className="relative">
              <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Mindestflaeche (m2)
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pr-14 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
              <span className="absolute right-4 top-[49px] text-xs font-semibold text-slate-500 dark:text-slate-400">
                m2
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
