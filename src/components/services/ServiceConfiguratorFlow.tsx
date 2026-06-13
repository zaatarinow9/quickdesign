"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  Info,
  Layers3,
  Palette,
  ShoppingCart,
  Upload,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import TshirtDesigner from "./TshirtDesigner";
import { useCartStore, type FullDesignData } from "@/lib/store/cart";
import { calculateServicePrice } from "@/lib/services/configuration/pricing";
import {
  createConfigurationSnapshot,
  type LegacyConfigurationTextInputs,
  type ServiceConfigurationSnapshotColorValue,
  type ServiceConfigurationSnapshotSelectedOption,
  type ServiceConfigurationSnapshotTextField,
  type ServiceConfigurationSnapshotUploadField,
  type ServiceConfigurationSnapshotValue,
} from "@/lib/services/configuration/snapshot";
import {
  validateSelectedFile,
  type CartPendingUpload,
} from "@/lib/storage/order-files";
import {
  MAX_SERVER_ACTION_UPLOAD_MB,
  getEffectiveUploadLimitMb,
  getServerActionUploadLimitMessage,
  isUploadLimitCapped,
} from "@/lib/storage/upload-limits";
import { cn } from "@/lib/utils";
import type {
  NormalizedServiceConfig,
  NormalizedServiceField,
  NormalizedServicePricingMode,
  NormalizedUploadField,
} from "@/lib/services/configuration/types";
import QuantityStepper from "@/components/ui/QuantityStepper";

const COMMON_COLORS = [
  { name: "Weiß", hex: "#FFFFFF" },
  { name: "Schwarz", hex: "#222222" },
  { name: "Marineblau", hex: "#1A2942" },
  { name: "Rot", hex: "#C91A1A" },
  { name: "Grau", hex: "#9CA3AF" },
  { name: "Königsblau", hex: "#1D4ED8" },
  { name: "Waldgrün", hex: "#15803D" },
  { name: "Sonnengelb", hex: "#EAB308" },
] as const;

type FlowStepId = "configuration" | "uploads" | "review" | "order";

type FlowStep = {
  id: FlowStepId;
  label: string;
  description: string;
};

type ServiceSummary = {
  id: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
};

type OptionUploadPreview = {
  name: string;
  file: File;
  sizeBytes: number;
  contentType: string;
};

type UploadFieldFile = {
  name: string;
  file: File;
  sizeBytes: number;
  contentType: string;
  customerLabel: string;
};

type UploadFieldFileMap = Record<string, Record<number, UploadFieldFile>>;

type SummaryEntry = {
  label: string;
  value: string;
};

interface Props {
  service: ServiceSummary;
  config: NormalizedServiceConfig;
}

function isValueField(
  field: NormalizedServiceField,
): field is NormalizedServiceField & { kind: "select" | "radio" | "size" } {
  return (
    field.kind === "select" || field.kind === "radio" || field.kind === "size"
  );
}

function isTextInputField(
  field: NormalizedServiceField,
): field is NormalizedServiceField & { kind: "text" | "number" } {
  return field.kind === "text" || field.kind === "number";
}

function isFileField(
  field: NormalizedServiceField,
): field is NormalizedServiceField & { kind: "file" } {
  return field.kind === "file";
}

function buildInitialValueSelections(
  config: NormalizedServiceConfig,
): Record<string, string> {
  const initialSelections: Record<string, string> = {};

  config.fields.forEach((field) => {
    if (field.defaultValueId) {
      initialSelections[field.id] = field.defaultValueId;
    }
  });

  return initialSelections;
}

function buildInitialTierSelection(config: NormalizedServiceConfig): string {
  if (config.pricing.mode !== "quantity_tiers") {
    return "";
  }

  return config.pricing.quantityTiers[0]?.id ?? "";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.max(0, value));
}

function formatDisplayNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getPricingModeLabel(mode: NormalizedServicePricingMode): string {
  switch (mode) {
    case "quantity_tiers":
      return "Mengenstaffel";
    case "area":
      return "Flächenpreis";
    case "option_based":
      return "Optionen mit Aufpreis";
    case "custom_quote":
      return "Preis auf Anfrage";
    case "fixed":
    default:
      return "Festpreis";
  }
}

function getColorName(hex: string): string | null {
  return (
    COMMON_COLORS.find((color) => color.hex.toLowerCase() === hex.toLowerCase())
      ?.name ?? null
  );
}

function getUploadFieldStatusText(field: NormalizedUploadField): string {
  const details: string[] = [];
  const effectiveUploadLimitMb = getEffectiveUploadLimitMb(field.maxFileSizeMb);

  if (field.allowedFileTypesText) {
    details.push(`Formate: ${field.allowedFileTypesText}`);
  }

  details.push(
    field.maxFiles === 1
      ? "Maximal 1 Datei"
      : `Maximal ${field.maxFiles} Dateien`,
  );
  details.push(`Max. ${effectiveUploadLimitMb} MB pro Datei`);

  return details.join(" · ");
}

function getCheckoutUploadLimitHint(): string {
  return `Aktuelles Upload-Limit im Checkout: ${MAX_SERVER_ACTION_UPLOAD_MB} MB`;
}

function getMaxFileSizeValidationMessage(
  configuredMaxFileSizeMb: number | null | undefined,
): string | undefined {
  return getEffectiveUploadLimitMb(configuredMaxFileSizeMb) ===
    MAX_SERVER_ACTION_UPLOAD_MB
    ? getServerActionUploadLimitMessage()
    : undefined;
}

function getUploadFieldFilesCount(
  uploadFieldFiles: UploadFieldFileMap,
  fieldId: string,
): number {
  return Object.keys(uploadFieldFiles[fieldId] ?? {}).length;
}

function getUploadFieldFile(
  uploadFieldFiles: UploadFieldFileMap,
  fieldId: string,
  slotIndex: number,
): UploadFieldFile | null {
  return uploadFieldFiles[fieldId]?.[slotIndex] ?? null;
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

function getLeadPriceLabel(
  service: ServiceSummary,
  config: NormalizedServiceConfig,
): string {
  if (config.pricing.mode === "custom_quote") {
    return "Preis auf Anfrage";
  }

  if (config.pricing.mode === "area" && config.pricing.area) {
    return `ab ${formatCurrency(config.pricing.area.pricePerSqm)} / m²`;
  }

  if (config.pricing.mode === "quantity_tiers") {
    const lowestTierPrice = getLowestTierPrice(config);

    if (lowestTierPrice !== null) {
      return `ab ${formatCurrency(lowestTierPrice)}`;
    }
  }

  return `ab ${formatCurrency(service.basePrice)}`;
}

function buildSteps(hasUploadStep: boolean): FlowStep[] {
  return [
    {
      id: "configuration",
      label: "Konfiguration",
      description: "Produkt und Preis einstellen",
    },
    ...(hasUploadStep
      ? [
          {
            id: "uploads" as const,
            label: "Dateien",
            description: "Produktionsdaten hochladen",
          },
        ]
      : []),
    {
      id: "review",
      label: "Übersicht",
      description: "Auswahl prüfen",
    },
    {
      id: "order",
      label: "Bestellung",
      description: "Warenkorb und Checkout",
    },
  ];
}

function Stepper({
  steps,
  currentStep,
  onSelect,
  canSelect,
  isComplete,
}: {
  steps: FlowStep[];
  currentStep: FlowStepId;
  onSelect: (stepId: FlowStepId) => void;
  canSelect: (stepId: FlowStepId) => boolean;
  isComplete: (stepId: FlowStepId) => boolean;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
      {steps.map((step, index) => {
        const active = step.id === currentStep;
        const complete = isComplete(step.id);

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              if (canSelect(step.id)) {
                onSelect(step.id);
              }
            }}
            disabled={!canSelect(step.id)}
            className={`min-w-[220px] rounded-[24px] border px-4 py-4 text-left transition-all md:min-w-0 ${
              active
                ? "border-neutral-950 bg-neutral-950 text-white shadow-lg"
                : complete
                  ? "border-neutral-300 bg-white text-neutral-950"
                  : "border-neutral-200 bg-neutral-50 text-neutral-600 disabled:cursor-not-allowed"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                  active
                    ? "border-white/30 bg-white/10 text-white"
                    : complete
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-300 bg-white text-neutral-500"
                }`}
              >
                {complete ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{step.label}</p>
                <p
                  className={`mt-1 text-xs leading-5 ${
                    active ? "text-neutral-300" : "text-neutral-500"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-950">
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-7 text-neutral-600">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function SummaryList({
  entries,
  emptyLabel,
}: {
  entries: SummaryEntry[];
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={`${entry.label}-${entry.value}`}
          className="public-detail-row rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3"
        >
          <span className="min-w-0 text-sm text-neutral-500">{entry.label}</span>
          <span className="max-w-full text-sm font-medium text-neutral-950 sm:max-w-[65%] sm:text-right">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "public-pill self-start px-3 py-1 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export default function ServiceConfiguratorFlow({ service, config }: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const [designData, setDesignData] = useState<FullDesignData>(() => ({
    model: config.designSettings.defaultModel,
    color: config.designSettings.defaultColor,
    frontLogos: [],
    backLogos: [],
  }));
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    () => buildInitialValueSelections(config),
  );
  const [textFieldValues, setTextFieldValues] = useState<Record<string, string>>(
    {},
  );
  const [optionFileValues, setOptionFileValues] = useState<
    Record<string, OptionUploadPreview>
  >({});
  const [uploadFieldFiles, setUploadFieldFiles] = useState<UploadFieldFileMap>(
    {},
  );
  const [selectedQuantityTierId, setSelectedQuantityTierId] = useState<string>(
    () => buildInitialTierSelection(config),
  );
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [orderNotes, setOrderNotes] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<FlowStepId>("configuration");
  const [isAdded, setIsAdded] = useState(false);

  const priceResult = useMemo(
    () =>
      calculateServicePrice({
        config,
        selectedValues,
        quantity,
        selectedQuantityTierId: selectedQuantityTierId || null,
        area: {
          widthCm,
          heightCm,
        },
      }),
    [config, heightCm, quantity, selectedQuantityTierId, selectedValues, widthCm],
  );

  const orderedConfigurationFields = config.fields.filter(
    (field) => field.kind !== "file",
  );
  const fileFields = config.fields.filter(isFileField);
  const hasUploadStep = fileFields.length > 0 || config.uploadSettings.enabled;
  const steps = useMemo(() => buildSteps(hasUploadStep), [hasUploadStep]);
  const pricingModeLabel = getPricingModeLabel(config.pricing.mode);
  const isQuoteOnly = priceResult.isQuoteOnly;
  const selectedTier =
    config.pricing.mode === "quantity_tiers"
      ? config.pricing.quantityTiers.find(
          (tier) => tier.id === priceResult.selectedTierId,
        ) ?? null
      : null;

  const configurationMissing = useMemo(() => {
    const missing: string[] = [];

    orderedConfigurationFields.forEach((field) => {
      if (!field.required) {
        return;
      }

      if (isValueField(field) && !selectedValues[field.id]) {
        missing.push(field.label);
        return;
      }

      if (isTextInputField(field) && !textFieldValues[field.id]?.trim()) {
        missing.push(field.label);
      }
    });

    if (config.pricing.mode === "quantity_tiers" && !priceResult.selectedTierId) {
      missing.push("Mengenstaffel");
    }

    if (config.pricing.mode === "area" && config.pricing.area) {
      if (priceResult.widthCm <= 0) {
        missing.push(config.pricing.area.widthLabel);
      }

      if (priceResult.heightCm <= 0) {
        missing.push(config.pricing.area.heightLabel);
      }
    }

    return missing;
  }, [
    config.pricing,
    orderedConfigurationFields,
    priceResult.heightCm,
    priceResult.selectedTierId,
    priceResult.widthCm,
    selectedValues,
    textFieldValues,
  ]);

  const uploadMissing = useMemo(() => {
    const missing: string[] = [];

    fileFields.forEach((field) => {
      if (field.required && !optionFileValues[field.id]) {
        missing.push(field.label);
      }
    });

    config.uploadSettings.fields.forEach((field) => {
      if (field.required && getUploadFieldFilesCount(uploadFieldFiles, field.id) === 0) {
        missing.push(field.label);
      }
    });

    return missing;
  }, [config.uploadSettings.fields, fileFields, optionFileValues, uploadFieldFiles]);

  const selectedOptionEntries = useMemo<SummaryEntry[]>(() => {
    return orderedConfigurationFields.flatMap((field) => {
      if (isValueField(field)) {
        const selectedValueId = selectedValues[field.id];
        const selectedValue = field.values.find((value) => value.id === selectedValueId);

        if (!selectedValue) {
          return [];
        }

        return [
          {
            label: field.label,
            value:
              selectedValue.price > 0
                ? `${selectedValue.label} (+${formatCurrency(selectedValue.price)})`
                : selectedValue.label,
          },
        ];
      }

      if (isTextInputField(field)) {
        const value = textFieldValues[field.id]?.trim();

        if (!value) {
          return [];
        }

        return [{ label: field.label, value }];
      }

      return [];
    });
  }, [orderedConfigurationFields, selectedValues, textFieldValues]);

  const selectedUploadEntries = useMemo<SummaryEntry[]>(() => {
    const optionUploadEntries = fileFields.flatMap((field) => {
      const file = optionFileValues[field.id];

      if (!file) {
        return [];
      }

      return [
        {
          label: field.label,
          value: `${file.name} (${formatFileSize(file.sizeBytes)})`,
        },
      ];
    });

    const configuredUploadEntries = config.uploadSettings.fields.flatMap((field) => {
      return Object.entries(uploadFieldFiles[field.id] ?? {})
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([slotIndexRaw, file]) => {
          const slotIndex = Number(slotIndexRaw);
          const slotLabel =
            field.maxFiles > 1 ? `${field.label} ${slotIndex + 1}` : field.label;
          const customerLabel = file.customerLabel.trim();

          return {
            label: slotLabel,
            value: customerLabel
              ? `${file.name} · ${customerLabel}`
              : `${file.name} (${formatFileSize(file.sizeBytes)})`,
          };
        });
    });

    return [...optionUploadEntries, ...configuredUploadEntries];
  }, [config.uploadSettings.fields, fileFields, optionFileValues, uploadFieldFiles]);

  const priceEntries = useMemo<SummaryEntry[]>(() => {
    if (isQuoteOnly) {
      return [
        { label: "Preismodell", value: pricingModeLabel },
        { label: "Preisstatus", value: "Preis auf Anfrage" },
      ];
    }

    const entries: SummaryEntry[] = [
      { label: "Preismodell", value: pricingModeLabel },
      {
        label: config.pricing.mode === "quantity_tiers" ? "Anzahl Sets" : "Menge",
        value: String(quantity),
      },
    ];

    if (selectedTier) {
      entries.push({
        label: "Staffel",
        value: `${selectedTier.label} · ${formatCurrency(selectedTier.price)}`,
      });
    }

    if (config.pricing.mode === "area" && config.pricing.area) {
      entries.push(
        {
          label: config.pricing.area.widthLabel,
          value: `${formatDisplayNumber(priceResult.widthCm)} cm`,
        },
        {
          label: config.pricing.area.heightLabel,
          value: `${formatDisplayNumber(priceResult.heightCm)} cm`,
        },
      );
    }

    entries.push(
      {
        label: "Aufpreise",
        value: formatCurrency(priceResult.optionPriceImpact),
      },
      {
        label: "Gesamtpreis",
        value: formatCurrency(priceResult.total),
      },
    );

    return entries;
  }, [
    config.pricing,
    isQuoteOnly,
    priceResult.heightCm,
    priceResult.optionPriceImpact,
    priceResult.total,
    priceResult.widthCm,
    pricingModeLabel,
    quantity,
    selectedTier,
  ]);

  function clearValidationMessage() {
    if (validationMessage) {
      setValidationMessage(null);
    }
  }

  function handleStepSelection(stepId: FlowStepId) {
    clearValidationMessage();
    setCurrentStep(stepId);
  }

  function canSelectStep(stepId: FlowStepId): boolean {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    const targetIndex = steps.findIndex((step) => step.id === stepId);

    if (stepId === "order") {
      return isAdded;
    }

    return targetIndex <= currentIndex;
  }

  function isStepComplete(stepId: FlowStepId): boolean {
    if (stepId === "configuration") {
      return configurationMissing.length === 0;
    }

    if (stepId === "uploads") {
      return !hasUploadStep || uploadMissing.length === 0;
    }

    if (stepId === "review") {
      return isAdded;
    }

    return isAdded;
  }

  function showConfigurationError() {
    setValidationMessage(
      `Bitte vervollständigen Sie zuerst: ${configurationMissing.join(", ")}`,
    );
  }

  function showUploadError() {
    setValidationMessage(
      `Bitte laden Sie noch folgende Pflichtdateien hoch: ${uploadMissing.join(", ")}`,
    );
  }

  function handleOptionFileUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: NormalizedServiceField & { kind: "file" },
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationResult = validateSelectedFile(file, {
      accept: field.accept ?? "*/*",
      maxFileSizeMb: getEffectiveUploadLimitMb(null),
      maxFileSizeMessage: getServerActionUploadLimitMessage(),
    });

    if (!validationResult.ok) {
      setValidationMessage(validationResult.message);
      event.target.value = "";
      return;
    }

    clearValidationMessage();

    setOptionFileValues((current) => ({
      ...current,
      [field.id]: {
        name: file.name,
        file,
        sizeBytes: file.size,
        contentType: file.type,
      },
    }));
  }

  function handleConfiguredUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: NormalizedUploadField,
    slotIndex: number,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationResult = validateSelectedFile(file, {
      accept: field.accept,
      maxFileSizeMb: getEffectiveUploadLimitMb(field.maxFileSizeMb),
      maxFileSizeMessage: getMaxFileSizeValidationMessage(field.maxFileSizeMb),
    });

    if (!validationResult.ok) {
      setValidationMessage(validationResult.message);
      event.target.value = "";
      return;
    }

    clearValidationMessage();

    setUploadFieldFiles((current) => ({
      ...current,
      [field.id]: {
        ...(current[field.id] ?? {}),
        [slotIndex]: {
          name: file.name,
          file,
          sizeBytes: file.size,
          contentType: file.type,
          customerLabel: current[field.id]?.[slotIndex]?.customerLabel ?? "",
        },
      },
    }));
  }

  function updateConfiguredUploadLabel(
    fieldId: string,
    slotIndex: number,
    customerLabel: string,
  ) {
    clearValidationMessage();

    setUploadFieldFiles((current) => {
      const currentFieldFile = current[fieldId]?.[slotIndex];

      if (!currentFieldFile) {
        return current;
      }

      return {
        ...current,
        [fieldId]: {
          ...(current[fieldId] ?? {}),
          [slotIndex]: {
            ...currentFieldFile,
            customerLabel,
          },
        },
      };
    });
  }

  function removeConfiguredUpload(fieldId: string, slotIndex: number) {
    clearValidationMessage();

    setUploadFieldFiles((current) => {
      const nextFieldFiles = { ...(current[fieldId] ?? {}) };
      delete nextFieldFiles[slotIndex];

      if (Object.keys(nextFieldFiles).length === 0) {
        const nextState = { ...current };
        delete nextState[fieldId];
        return nextState;
      }

      return {
        ...current,
        [fieldId]: nextFieldFiles,
      };
    });
  }

  function renderConfigurationField(field: NormalizedServiceField) {
    if (isValueField(field) && field.kind !== "select") {
      return (
        <div
          key={field.id}
          className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <label className="text-sm font-semibold text-neutral-950">
                {field.label}
              </label>
              {field.helperText ? (
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  {field.helperText}
                </p>
              ) : null}
            </div>
            {field.required ? (
              <StatusPill className="border border-neutral-200 bg-white text-neutral-600">
                Pflichtfeld
              </StatusPill>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {field.values.map((value) => {
              const active = selectedValues[field.id] === value.id;

              return (
                <button
                  key={value.id}
                  type="button"
                  onClick={() => {
                    clearValidationMessage();
                    setSelectedValues((current) => ({
                      ...current,
                      [field.id]: value.id,
                    }));
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    active
                      ? "border-neutral-950 bg-white shadow-sm"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-950">
                        {value.label}
                      </p>
                      {value.price > 0 ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          Aufpreis {formatCurrency(value.price)}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-neutral-500">
                          Ohne Aufpreis
                        </p>
                      )}
                    </div>
                    <span
                      className={`mt-0.5 h-4 w-4 rounded-full border ${
                        active
                          ? "border-neutral-950 bg-neutral-950"
                          : "border-neutral-300 bg-white"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (isValueField(field)) {
      return (
        <div
          key={field.id}
          className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <label className="text-sm font-semibold text-neutral-950">
                {field.label}
              </label>
              {field.helperText ? (
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  {field.helperText}
                </p>
              ) : null}
            </div>
            {field.required ? (
              <StatusPill className="border border-neutral-200 bg-white text-neutral-600">
                Pflichtfeld
              </StatusPill>
            ) : null}
          </div>

          <select
            value={selectedValues[field.id] || ""}
            disabled={field.values.length === 0}
            onChange={(event) => {
              clearValidationMessage();
              setSelectedValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }));
            }}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-950 outline-none transition-colors focus:border-neutral-950 disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            <option value="">Bitte wählen</option>
            {field.values.map((value) => (
              <option key={value.id} value={value.id}>
                {value.label}
                {value.price > 0 ? ` (+${formatCurrency(value.price)})` : ""}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (isTextInputField(field)) {
      return (
        <div
          key={field.id}
          className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <label className="text-sm font-semibold text-neutral-950">
                {field.label}
              </label>
              {field.helperText ? (
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  {field.helperText}
                </p>
              ) : null}
            </div>
            {field.required ? (
              <StatusPill className="border border-neutral-200 bg-white text-neutral-600">
                Pflichtfeld
              </StatusPill>
            ) : null}
          </div>

          <input
            type={field.kind === "number" ? "number" : "text"}
            value={textFieldValues[field.id] ?? ""}
            onChange={(event) => {
              clearValidationMessage();
              setTextFieldValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }));
            }}
            placeholder={field.placeholder || field.label}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-950 outline-none transition-colors focus:border-neutral-950"
          />
        </div>
      );
    }

    return null;
  }

  function renderOptionUploadField(field: NormalizedServiceField & { kind: "file" }) {
    const currentFile = optionFileValues[field.id];

    return (
      <div
        key={field.id}
        className="rounded-[24px] border border-neutral-200 bg-white p-5 sm:p-6"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-950">
              {field.label}
            </h3>
            {field.helperText ? (
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                {field.helperText}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-neutral-500">
              {getCheckoutUploadLimitHint()}
            </p>
          </div>
          {field.required ? (
            <StatusPill className="bg-neutral-100 text-neutral-600">
              Pflichtfeld
            </StatusPill>
          ) : null}
        </div>

        {!currentFile ? (
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-950 hover:bg-white">
            <Upload className="h-4 w-4" />
            Datei auswählen
            <input
              type="file"
              className="hidden"
              accept={field.accept}
              onChange={(event) => handleOptionFileUpload(event, field)}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-950">
                  {currentFile.name}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {formatFileSize(currentFile.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearValidationMessage();
                  setOptionFileValues((current) => {
                    const next = { ...current };
                    delete next[field.id];
                    return next;
                  });
                }}
                className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
              >
                Datei entfernen
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderConfiguredUploadField(field: NormalizedUploadField) {
    const selectedFilesCount = getUploadFieldFilesCount(uploadFieldFiles, field.id);

    return (
      <div
        key={field.id}
        className="rounded-[24px] border border-neutral-200 bg-white p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-950">
                {field.label}
              </h3>
              {field.required ? (
                <StatusPill className="bg-neutral-100 text-neutral-600">
                  Pflichtfeld
                </StatusPill>
              ) : null}
            </div>
            {field.helperText ? (
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                {field.helperText}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-neutral-500">
              {getUploadFieldStatusText(field)}
            </p>
            {isUploadLimitCapped(field.maxFileSizeMb) ? (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Aktuelles Upload-Limit im Checkout: {MAX_SERVER_ACTION_UPLOAD_MB} MB
              </p>
            ) : null}
          </div>
          <StatusPill className="border border-neutral-200 bg-neutral-50 text-neutral-600">
            {selectedFilesCount > 0
              ? `${selectedFilesCount} ausgewählt`
              : "Keine Datei ausgewählt"}
          </StatusPill>
        </div>

        <div className="space-y-4">
          {Array.from({ length: field.maxFiles }).map((_, slotIndex) => {
            const currentFile = getUploadFieldFile(uploadFieldFiles, field.id, slotIndex);
            const slotLabel =
              field.maxFiles > 1 ? `${field.label} ${slotIndex + 1}` : field.label;

            return (
              <div key={`${field.id}-${slotIndex}`} className="space-y-3">
                {!currentFile ? (
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-950 hover:bg-white">
                    <Upload className="h-4 w-4" />
                    {field.maxFiles > 1 ? `${slotLabel} auswählen` : "Datei auswählen"}
                    <input
                      type="file"
                      className="hidden"
                      accept={field.accept}
                      onChange={(event) =>
                        handleConfiguredUpload(event, field, slotIndex)
                      }
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-950">
                          {currentFile.name}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatFileSize(currentFile.sizeBytes)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeConfiguredUpload(field.id, slotIndex)}
                        className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
                      >
                        Datei entfernen
                      </button>
                    </div>

                    {field.allowCustomerFileLabel ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-950">
                          Kundenbezeichnung
                        </label>
                        <input
                          type="text"
                          value={currentFile.customerLabel}
                          onChange={(event) =>
                            updateConfiguredUploadLabel(
                              field.id,
                              slotIndex,
                              event.target.value,
                            )
                          }
                          placeholder="Zum Beispiel Vorderseite final"
                          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-950 outline-none transition-colors focus:border-neutral-950"
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function goToNextStepFromConfiguration() {
    if (configurationMissing.length > 0) {
      showConfigurationError();
      return;
    }

    clearValidationMessage();
    setCurrentStep(hasUploadStep ? "uploads" : "review");
  }

  function goToNextStepFromUploads() {
    if (uploadMissing.length > 0) {
      showUploadError();
      return;
    }

    clearValidationMessage();
    setCurrentStep("review");
  }

  function handleAddToCart() {
    if (isQuoteOnly) {
      return;
    }

    if (configurationMissing.length > 0) {
      setCurrentStep("configuration");
      showConfigurationError();
      return;
    }

    if (uploadMissing.length > 0) {
      setCurrentStep(hasUploadStep ? "uploads" : "configuration");
      showUploadError();
      return;
    }

    clearValidationMessage();

    const richOptions: Record<
      string,
      { optionName: string; valueName: string; price: number }
    > = {};
    const pendingUploads: CartPendingUpload[] = [];
    const textInputs: LegacyConfigurationTextInputs = {};
    const snapshotSelectedOptions: ServiceConfigurationSnapshotSelectedOption[] = [];
    const snapshotTextFields: ServiceConfigurationSnapshotTextField[] = [];
    const snapshotUploadFields: ServiceConfigurationSnapshotUploadField[] = [];
    let snapshotSize: ServiceConfigurationSnapshotValue | null = null;

    config.fields.forEach((field) => {
      if (isValueField(field)) {
        const selectedValueId = selectedValues[field.id];
        const selectedValue = field.values.find((value) => value.id === selectedValueId);

        if (!selectedValue) {
          return;
        }

        if (field.source === "option" && field.kind !== "size") {
          const optionKey = field.sourceOptionId ?? field.id;

          richOptions[optionKey] = {
            optionName: field.label,
            valueName: selectedValue.label,
            price: selectedValue.price,
          };

          snapshotSelectedOptions.push({
            fieldKey: field.key,
            fieldLabel: field.label,
            valueKey: selectedValue.id,
            valueLabel: selectedValue.label,
            priceImpact: selectedValue.price,
          });
        }

        if (field.kind === "size") {
          textInputs[field.key] = {
            optionName: field.label,
            value: selectedValue.label,
          };

          snapshotSize = {
            fieldKey: field.key,
            fieldLabel: field.label,
            value: selectedValue.label,
          };
        }

        return;
      }

      if (isTextInputField(field)) {
        const value = textFieldValues[field.id]?.trim();

        if (!value) {
          return;
        }

        textInputs[field.key] = {
          optionName: field.label,
          value,
        };

        snapshotTextFields.push({
          fieldKey: field.key,
          fieldLabel: field.label,
          value,
          kind: field.kind,
        });
        return;
      }

      if (isFileField(field)) {
        const fileValue = optionFileValues[field.id];

        if (!fileValue) {
          return;
        }

        textInputs[field.key] = {
          optionName: field.label,
          value: fileValue.name,
        };

        pendingUploads.push({
          source: "option",
          fieldKey: field.key,
          fieldLabel: field.label,
          slotIndex: 0,
          customerLabel: "",
          file: fileValue.file,
        });

        snapshotUploadFields.push({
          fieldKey: field.key,
          fieldLabel: field.label,
          files: [
            {
              fileName: fileValue.name,
              originalName: fileValue.name,
              customerLabel: null,
              fileType: null,
              contentType: fileValue.contentType || null,
              fileSize: fileValue.sizeBytes,
              fileUrl: null,
              bucket: null,
              path: null,
              uploadedAt: null,
            },
          ],
        });
      }
    });

    if (config.pricing.mode === "quantity_tiers" && selectedTier) {
      textInputs.pricing_model = {
        optionName: "Preismodell",
        value: "Mengenstaffel",
      };
      textInputs.pricing_tier = {
        optionName: "Mengenstaffel",
        value: selectedTier.label,
      };
    }

    if (config.pricing.mode === "area" && config.pricing.area) {
      textInputs.pricing_model = {
        optionName: "Preismodell",
        value: "Flächenpreis",
      };
      textInputs.pricing_width_cm = {
        optionName: config.pricing.area.widthLabel,
        value: `${formatDisplayNumber(priceResult.widthCm)} cm`,
      };
      textInputs.pricing_height_cm = {
        optionName: config.pricing.area.heightLabel,
        value: `${formatDisplayNumber(priceResult.heightCm)} cm`,
      };
      textInputs.pricing_area_sqm = {
        optionName: "Fläche",
        value: `${priceResult.billableAreaSqm.toFixed(3)} m²`,
      };
    }

    config.uploadSettings.fields.forEach((field) => {
      const fieldFiles = uploadFieldFiles[field.id];

      if (!fieldFiles) {
        return;
      }

      const snapshotFiles = Object.entries(fieldFiles)
        .sort(([leftIndex], [rightIndex]) => Number(leftIndex) - Number(rightIndex))
        .map(([slotIndexRaw, file]) => {
          const slotIndex = Number(slotIndexRaw);
          const keySuffix = field.maxFiles > 1 ? `_${slotIndex + 1}` : "";
          const baseKey = `upload_${field.key}${keySuffix}`;
          const optionName =
            field.maxFiles > 1 ? `${field.label} ${slotIndex + 1}` : field.label;

          textInputs[baseKey] = {
            optionName,
            value: file.name,
          };

          if (field.allowCustomerFileLabel && file.customerLabel.trim() !== "") {
            textInputs[`${baseKey}_label`] = {
              optionName: `${optionName} Label`,
              value: file.customerLabel.trim(),
            };
          }

          pendingUploads.push({
            source: "upload",
            fieldKey: field.key,
            fieldLabel: field.label,
            slotIndex,
            customerLabel:
              field.allowCustomerFileLabel && file.customerLabel.trim() !== ""
                ? file.customerLabel.trim()
                : "",
            file: file.file,
          });

          return {
            fileName: file.name,
            originalName: file.name,
            customerLabel:
              field.allowCustomerFileLabel && file.customerLabel.trim() !== ""
                ? file.customerLabel.trim()
                : null,
            fileType: null,
            contentType: file.contentType || null,
            fileSize: file.sizeBytes,
            fileUrl: null,
            bucket: null,
            path: null,
            uploadedAt: null,
          };
        });

      if (snapshotFiles.length > 0) {
        snapshotUploadFields.push({
          fieldKey: field.key,
          fieldLabel: field.label,
          files: snapshotFiles,
        });
      }
    });

    const normalizedDesignData = config.designSettings.enabled ? designData : undefined;
    const designMetadata = normalizedDesignData
      ? {
          model: normalizedDesignData.model,
          color: normalizedDesignData.color,
          frontLogoCount: normalizedDesignData.frontLogos.length,
          backLogoCount: normalizedDesignData.backLogos.length,
        }
      : null;
    const snapshotColor: ServiceConfigurationSnapshotColorValue | null =
      designMetadata
        ? {
            fieldKey: "product_color",
            fieldLabel: "Produktfarbe",
            value: getColorName(designMetadata.color) ?? designMetadata.color,
            hex: designMetadata.color,
          }
        : null;
    const normalizedOrderNotes = orderNotes.trim();
    const configurationSnapshot = createConfigurationSnapshot({
      serviceId: service.id,
      serviceName: service.name,
      pricingModel: config.pricing.mode,
      calculatedPrice: {
        currency: "EUR",
        total: priceResult.total,
        basePrice: priceResult.basePrice,
        baseUnitPrice: priceResult.baseUnitPrice,
        optionPriceImpact: priceResult.optionPriceImpact,
        quantity,
      },
      quantity,
      selectedOptions: snapshotSelectedOptions,
      selectedPricingTier: selectedTier
        ? {
            id: selectedTier.id,
            label: selectedTier.label,
            quantity: selectedTier.quantity,
            price: selectedTier.price,
          }
        : null,
      area:
        config.pricing.mode === "area" && config.pricing.area
          ? {
              widthCm: priceResult.widthCm,
              heightCm: priceResult.heightCm,
              areaSqm: priceResult.billableAreaSqm,
              pricePerSqm: priceResult.pricePerSqm,
            }
          : null,
      uploadFields: snapshotUploadFields,
      textFields: snapshotTextFields,
      size: snapshotSize,
      color: snapshotColor,
      design: designMetadata,
      customerNotes: normalizedOrderNotes || null,
      orderNotes: normalizedOrderNotes || null,
      customQuote: isQuoteOnly,
    });

    addItem({
      cartItemId: uuidv4(),
      serviceId: service.id,
      name: service.name,
      image: service.image,
      basePrice: service.basePrice,
      quantity,
      selectedOptions: richOptions,
      textInputs,
      totalPrice: priceResult.total,
      designData: normalizedDesignData,
      configurationSnapshot,
      orderNotes,
      pendingUploads,
    });

    setIsAdded(true);
    setCurrentStep("order");
  }

  function renderConfigurationStep() {
    return (
      <SectionCard
        title="Produkt konfigurieren"
        description="Wählen Sie alle produktrelevanten Angaben Schritt für Schritt aus. Die Felder kommen direkt aus der Service-Konfiguration im Admin-Bereich."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="space-y-4">
            {config.designSettings.showCanvas ? (
              <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Palette className="h-4 w-4 text-neutral-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-950">
                      Produktansicht
                    </h3>
                    <p className="text-sm leading-6 text-neutral-500">
                      Diese Angaben werden für die Produktion benötigt.
                    </p>
                  </div>
                </div>

                <TshirtDesigner
                  designData={designData}
                  setDesignData={setDesignData}
                />

                {config.designSettings.allowSecondaryColorPicker ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-sm font-medium text-neutral-950">
                      Produktfarbe
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {COMMON_COLORS.map((color) => {
                        const active = designData.color === color.hex;

                        return (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => {
                              clearValidationMessage();
                              setDesignData((current) => ({
                                ...current,
                                color: color.hex,
                              }));
                            }}
                            className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition-all ${
                              active
                                ? "border-neutral-950 bg-white shadow-sm"
                                : "border-neutral-200 bg-white hover:border-neutral-400"
                            }`}
                          >
                            <span
                              className="h-5 w-5 rounded-full border border-neutral-200"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="font-medium text-neutral-800">
                              {color.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {orderedConfigurationFields.length > 0 ? (
              orderedConfigurationFields.map(renderConfigurationField)
            ) : (
              <div className="rounded-[24px] border border-dashed border-neutral-300 bg-neutral-50 px-5 py-6 text-sm leading-7 text-neutral-500">
                Für dieses Produkt sind keine zusätzlichen Konfigurationsfelder
                hinterlegt. Sie können direkt mit Menge und Preis fortfahren.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <Layers3 className="mt-0.5 h-4 w-4 text-neutral-500" />
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-950">
                      Preis und Menge
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-500">
                      Der Preis aktualisiert sich live während Ihrer Auswahl.
                    </p>
                  </div>

                  {config.pricing.mode === "custom_quote" ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                      Diese Leistung wird individuell kalkuliert. Die
                      Konfiguration bleibt erhalten, es wird aber kein
                      automatischer Preis berechnet.
                    </div>
                  ) : null}

                  {config.pricing.mode === "quantity_tiers" ? (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-neutral-950">
                        Mengenstaffel
                      </label>
                      <select
                        value={selectedQuantityTierId}
                        onChange={(event) => {
                          clearValidationMessage();
                          setSelectedQuantityTierId(event.target.value);
                        }}
                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-950 outline-none transition-colors focus:border-neutral-950"
                      >
                        {config.pricing.quantityTiers.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.label} ({formatCurrency(tier.price)})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {config.pricing.mode === "area" && config.pricing.area ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-neutral-950">
                            {config.pricing.area.widthLabel}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={widthCm}
                            onChange={(event) => {
                              clearValidationMessage();
                              setWidthCm(event.target.value);
                            }}
                            placeholder="0"
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-950 outline-none transition-colors focus:border-neutral-950"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-neutral-950">
                            {config.pricing.area.heightLabel}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={heightCm}
                            onChange={(event) => {
                              clearValidationMessage();
                              setHeightCm(event.target.value);
                            }}
                            placeholder="0"
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-950 outline-none transition-colors focus:border-neutral-950"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Abgerechnete Fläche: {priceResult.billableAreaSqm.toFixed(3)} m²
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-neutral-200 bg-white p-4 sm:p-5">
                    <div className="public-control-row">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-neutral-950">
                          {config.pricing.mode === "quantity_tiers"
                            ? "Anzahl Sets"
                            : "Menge"}
                        </label>
                        <p className="text-sm leading-6 text-neutral-500">
                          Die aktuelle Stückzahl wirkt sich direkt auf Ihren Gesamtpreis aus.
                        </p>
                      </div>
                      <QuantityStepper
                        value={quantity}
                        onDecrement={() => {
                          clearValidationMessage();
                          setQuantity(Math.max(1, quantity - 1));
                        }}
                        onIncrement={() => {
                          clearValidationMessage();
                          setQuantity(quantity + 1);
                        }}
                        decrementLabel="Menge verringern"
                        incrementLabel="Menge erhöhen"
                        tone="neutral"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4">
                    <p className="text-sm text-neutral-500">Aktueller Preis</p>
                    <p className="mt-2 text-3xl font-semibold text-neutral-950">
                      {isQuoteOnly ? "Preis auf Anfrage" : formatCurrency(priceResult.total)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {configurationMissing.length > 0 ? (
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                Noch nicht vollständig: {configurationMissing.join(", ")}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-7 text-neutral-500">
            Nur relevante Felder werden angezeigt. Pflichtangaben sind klar
            markiert.
          </p>
          <button
            type="button"
            onClick={goToNextStepFromConfiguration}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </SectionCard>
    );
  }

  function renderUploadsStep() {
    return (
      <SectionCard
        title="Dateien hochladen"
        description="Laden Sie alle erforderlichen Produktionsdateien sauber und getrennt nach Feld hoch."
      >
        <div className="space-y-4">
          {fileFields.map(renderOptionUploadField)}
          {config.uploadSettings.fields.map(renderConfiguredUploadField)}
        </div>

        {fileFields.length === 0 && config.uploadSettings.fields.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-neutral-300 bg-neutral-50 px-5 py-6 text-sm leading-7 text-neutral-500">
            Für dieses Produkt sind keine Upload-Felder erforderlich.
          </div>
        ) : null}

        {uploadMissing.length > 0 ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
            Noch nicht vollständig: {uploadMissing.join(", ")}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => handleStepSelection("configuration")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </button>
          <button
            type="button"
            onClick={goToNextStepFromUploads}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </SectionCard>
    );
  }

  function renderReviewStep() {
    const reviewMissing = [...configurationMissing, ...uploadMissing];

    return (
      <SectionCard
        title="Auswahl prüfen"
        description="Prüfen Sie Ihre Konfiguration, ergänzen Sie bei Bedarf Hinweise und legen Sie den Artikel dann in den Warenkorb."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-neutral-950">Produkt</h3>
              <p className="mt-3 text-sm text-neutral-600">{service.name}</p>
            </div>

            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-neutral-950">
                Menge / Staffel
              </h3>
              <div className="mt-3 space-y-3">
                <div className="public-detail-row text-sm">
                  <span className="text-neutral-500">
                    {config.pricing.mode === "quantity_tiers" ? "Anzahl Sets" : "Menge"}
                  </span>
                  <span className="font-medium text-neutral-950 sm:text-right">{quantity}</span>
                </div>
                {selectedTier ? (
                  <div className="public-detail-row text-sm">
                    <span className="text-neutral-500">Staffel</span>
                    <span className="font-medium text-neutral-950 sm:text-right">
                      {selectedTier.label}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-neutral-950">Optionen</h3>
              <div className="mt-3">
                <SummaryList
                  entries={selectedOptionEntries}
                  emptyLabel="Keine zusätzlichen Optionen ausgewählt."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-neutral-950">Dateien</h3>
              <div className="mt-3">
                <SummaryList
                  entries={selectedUploadEntries}
                  emptyLabel={
                    hasUploadStep
                      ? "Noch keine Datei ausgewählt."
                      : "Für dieses Produkt sind keine Dateien erforderlich."
                  }
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-neutral-950">Hinweise</h3>
              <textarea
                value={orderNotes}
                onChange={(event) => {
                  clearValidationMessage();
                  setOrderNotes(event.target.value);
                }}
                rows={5}
                placeholder="Zusätzliche Produktionshinweise oder Rückfragen"
                className="mt-3 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-950 outline-none transition-colors focus:border-neutral-950"
              />
            </div>

            <div className="rounded-[24px] border border-neutral-200 bg-neutral-950 p-5 text-white sm:p-6">
              <p className="text-sm text-neutral-300">Gesamtpreis</p>
              <p className="mt-2 text-3xl font-semibold">
                {isQuoteOnly ? "Preis auf Anfrage" : formatCurrency(priceResult.total)}
              </p>
            </div>
          </div>
        </div>

        {reviewMissing.length > 0 ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
            Noch nicht vollständig: {reviewMissing.join(", ")}
          </div>
        ) : null}

        {isQuoteOnly ? (
          <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm leading-7 text-neutral-600">
            Für diese Leistung ist aktuell kein automatischer Warenkorb- oder
            Checkout-Abschluss hinterlegt.
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() =>
              handleStepSelection(hasUploadStep ? "uploads" : "configuration")
            }
            className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={reviewMissing.length > 0 || isQuoteOnly || isAdded}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <ShoppingCart className="h-4 w-4" />
            In den Warenkorb
          </button>
        </div>
      </SectionCard>
    );
  }

  function renderOrderStep() {
    return (
      <SectionCard
        title="Bestellung vorbereiten"
        description="Der Artikel wurde dem Warenkorb hinzugefügt. Sie können jetzt zur Kasse gehen oder den Warenkorb noch einmal prüfen."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <h3 className="text-lg font-semibold text-emerald-950">
                  Artikel erfolgreich hinzugefügt
                </h3>
                <p className="mt-2 text-sm leading-7 text-emerald-900">
                  Ihre Konfiguration, Auswahlfelder, Hinweise und Upload-Metadaten
                  wurden für den Warenkorb übernommen.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-6">
            <h3 className="text-sm font-semibold text-neutral-950">
              Nächster Schritt
            </h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600">
              Im Warenkorb prüfen Sie die Position. Im Checkout ergänzen Sie nur
              noch Ihre Kundendaten und schließen die Bestellung ab.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => handleStepSelection("review")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            <ChevronLeft className="h-4 w-4" />
            Auswahl prüfen
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cart"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
            >
              Zum Warenkorb
            </Link>
            <Link
              href="/checkout"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              Zur Kasse
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionCard>
    );
  }

  function renderCurrentStep() {
    if (currentStep === "uploads") {
      return renderUploadsStep();
    }

    if (currentStep === "review") {
      return renderReviewStep();
    }

    if (currentStep === "order") {
      return renderOrderStep();
    }

    return renderConfigurationStep();
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="public-pill inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-700">
                  <Layers3 className="h-4 w-4" />
                  Schritt für Schritt konfigurieren
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-neutral-950 md:text-4xl">
                    {service.name}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 px-5 py-4">
                <p className="text-xs font-medium text-neutral-500">
                  Startpreis
                </p>
                <p className="mt-2 text-2xl font-semibold text-neutral-950">
                  {getLeadPriceLabel(service, config)}
                </p>
              </div>
            </div>

            <Stepper
              steps={steps}
              currentStep={currentStep}
              onSelect={handleStepSelection}
              canSelect={canSelectStep}
              isComplete={isStepComplete}
            />
          </div>

          <div className="border-t border-neutral-200 bg-neutral-50 p-6 xl:border-l xl:border-t-0">
            <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-[24px] border border-neutral-200 bg-white p-4">
              {config.designSettings.showCanvas ? (
                <div className="flex h-full w-full items-center justify-center rounded-[20px] bg-neutral-50">
                  <ImageIcon className="h-8 w-8 text-neutral-300" />
                </div>
              ) : (
                <img
                  src={service.image}
                  alt={service.name}
                  className="h-44 w-full object-contain sm:h-52"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {validationMessage ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
          {validationMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">{renderCurrentStep()}</div>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-950">
                  Ihre Auswahl
                </h2>
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  Live-Zusammenfassung Ihrer aktuellen Konfiguration.
                </p>
              </div>
              <StatusPill
                className={cn(
                  "shrink-0 self-start px-3.5 py-1.5 text-xs sm:self-auto",
                  configurationMissing.length === 0 && uploadMissing.length === 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                )}
              >
                {configurationMissing.length === 0 && uploadMissing.length === 0
                  ? "Vollständig"
                  : "Noch nicht vollständig"}
              </StatusPill>
            </div>

            <div className="mt-5 flex items-start gap-4 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4 sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white">
                <img
                  src={service.image}
                  alt={service.name}
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-950">
                  {service.name}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{pricingModeLabel}</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-950">Preis</p>
                <p className="mt-2 text-3xl font-semibold text-neutral-950">
                  {isQuoteOnly ? "Preis auf Anfrage" : formatCurrency(priceResult.total)}
                </p>
              </div>

              <div className="space-y-2">
                {priceEntries.map((entry) => (
                  <div
                    key={`${entry.label}-${entry.value}`}
                    className="public-detail-row rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                  >
                    <span className="min-w-0 text-sm text-neutral-500">{entry.label}</span>
                    <span className="max-w-full text-sm font-medium text-neutral-950 sm:max-w-[65%] sm:text-right">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-neutral-500" />
              <h2 className="text-lg font-semibold text-neutral-950">
                Details
              </h2>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-medium text-neutral-950">Optionen</p>
                <div className="mt-3">
                  <SummaryList
                    entries={selectedOptionEntries}
                    emptyLabel="Noch keine Auswahl."
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-neutral-950">Dateien</p>
                <div className="mt-3">
                  <SummaryList
                    entries={selectedUploadEntries}
                    emptyLabel={
                      hasUploadStep
                        ? "Noch keine Datei ausgewählt."
                        : "Keine Dateien erforderlich."
                    }
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-neutral-950">Hinweise</p>
                <p className="mt-2 text-sm leading-7 text-neutral-500">
                  {orderNotes.trim() || "Noch keine Hinweise hinterlegt."}
                </p>
              </div>
            </div>
          </section>

          {(configurationMissing.length > 0 || uploadMissing.length > 0) && (
            <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 text-amber-700" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-950">
                    Noch nicht vollständig
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-amber-900">
                    Bitte prüfen Sie die Pflichtfelder, bevor Sie den Artikel in
                    den Warenkorb legen.
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-amber-900">
                    {configurationMissing.map((item) => (
                      <p key={`config-${item}`}>{item}</p>
                    ))}
                    {uploadMissing.map((item) => (
                      <p key={`upload-${item}`}>{item}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
