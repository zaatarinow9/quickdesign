"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  ShoppingCart,
  CheckCircle2,
  Upload,
  FileText,
  X,
  Palette,
  Info,
  Ruler,
  Layers3,
} from "lucide-react";
import { useCartStore, type FullDesignData } from "@/lib/store/cart";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
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
import type {
  NormalizedServiceConfig,
  NormalizedServiceField,
  NormalizedServicePricingMode,
  NormalizedUploadField,
} from "@/lib/services/configuration/types";

const COMMON_COLORS = [
  { name: "Weiss", hex: "#FFFFFF" },
  { name: "Schwarz", hex: "#222222" },
  { name: "Marineblau", hex: "#1a2942" },
  { name: "Rot", hex: "#c91a1a" },
  { name: "Grau", hex: "#9ca3af" },
  { name: "Koenigsblau", hex: "#1d4ed8" },
  { name: "Waldgruen", hex: "#15803d" },
  { name: "Sonnengelb", hex: "#eab308" },
] as const;

type ServiceSummary = {
  id: string;
  name: string;
  image: string;
  basePrice: number;
};

type OptionUploadPreview = {
  name: string;
  url: string;
  sizeBytes: number;
  fileType: string;
};

type UploadFieldFile = {
  name: string;
  url: string;
  sizeBytes: number;
  customerLabel: string;
};

type UploadFieldFileMap = Record<string, Record<number, UploadFieldFile>>;

type ConfigSectionProps = {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

type SummaryRowProps = {
  label: string;
  value: string;
  emphasize?: boolean;
};

interface Props {
  service: ServiceSummary;
  config: NormalizedServiceConfig;
  designData?: FullDesignData;
  setDesignData?: Dispatch<SetStateAction<FullDesignData>>;
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
  return `${value.toFixed(2)} EUR`;
}

function formatDisplayNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getColorName(hex: string): string | null {
  return (
    COMMON_COLORS.find((color) => color.hex.toLowerCase() === hex.toLowerCase())
      ?.name ?? null
  );
}

function getUploadFieldStatusText(field: NormalizedUploadField): string {
  const parts: string[] = [];

  if (field.allowedFileTypesText) {
    parts.push(`Formate: ${field.allowedFileTypesText}`);
  }

  parts.push(
    field.maxFiles === 1
      ? "Maximal 1 Datei"
      : `Maximal ${field.maxFiles} Dateien`,
  );

  if (field.maxFileSizeMb) {
    parts.push(`Max. ${field.maxFileSizeMb} MB pro Datei`);
  }

  return parts.join(" | ");
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

function getPricingModeLabel(mode: NormalizedServicePricingMode): string {
  switch (mode) {
    case "quantity_tiers":
      return "Mengenstaffel";
    case "area":
      return "Flaechenpreis";
    case "option_based":
      return "Optionen mit Aufpreis";
    case "custom_quote":
      return "Preis auf Anfrage";
    case "fixed":
    default:
      return "Festpreis";
  }
}

function ConfigSection({
  icon,
  eyebrow,
  title,
  description,
  children,
}: ConfigSectionProps) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-neutral-50/80 p-5 md:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
            {icon}
            <span>{eyebrow}</span>
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-neutral-950">
              {title}
            </h3>
            {description && (
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {description}
              </p>
            )}
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}

function SummaryRow({ label, value, emphasize = false }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </span>
      <span
        className={`text-right font-bold tracking-tight ${
          emphasize ? "text-lg text-neutral-950" : "text-sm text-neutral-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function ServiceConfigurator({
  service,
  config,
  designData,
  setDesignData,
}: Props) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

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

  const isQuoteOnly = priceResult.isQuoteOnly;
  const pricingModeLabel = getPricingModeLabel(config.pricing.mode);
  const sizeFields = config.fields.filter(
    (field) => field.kind === "size",
  );
  const generalFields = config.fields.filter(
    (field) => field.kind !== "size" && field.kind !== "file",
  );
  const fileFields = config.fields.filter(isFileField);
  const hasUploadSection = fileFields.length > 0 || config.uploadSettings.enabled;

  const handleOptionFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldId: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result !== "string") return;

      setOptionFileValues((previous) => ({
        ...previous,
        [fieldId]: {
          name: file.name,
          url: result,
          sizeBytes: file.size,
          fileType: file.type,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleConfiguredUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: NormalizedUploadField,
    slotIndex: number,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      field.maxFileSizeMb !== null &&
      file.size > field.maxFileSizeMb * 1024 * 1024
    ) {
      alert(`Die Datei "${file.name}" ist groesser als ${field.maxFileSizeMb} MB.`);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result !== "string") return;

      setUploadFieldFiles((previous) => ({
        ...previous,
        [field.id]: {
          ...(previous[field.id] ?? {}),
          [slotIndex]: {
            name: file.name,
            url: result,
            sizeBytes: file.size,
            customerLabel:
              previous[field.id]?.[slotIndex]?.customerLabel ?? "",
          },
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const updateConfiguredUploadLabel = (
    fieldId: string,
    slotIndex: number,
    customerLabel: string,
  ) => {
    setUploadFieldFiles((previous) => {
      const currentFieldFile = previous[fieldId]?.[slotIndex];
      if (!currentFieldFile) {
        return previous;
      }

      return {
        ...previous,
        [fieldId]: {
          ...(previous[fieldId] ?? {}),
          [slotIndex]: {
            ...currentFieldFile,
            customerLabel,
          },
        },
      };
    });
  };

  const removeConfiguredUpload = (fieldId: string, slotIndex: number) => {
    setUploadFieldFiles((previous) => {
      const nextFieldFiles = { ...(previous[fieldId] ?? {}) };
      delete nextFieldFiles[slotIndex];

      if (Object.keys(nextFieldFiles).length === 0) {
        const nextState = { ...previous };
        delete nextState[fieldId];
        return nextState;
      }

      return {
        ...previous,
        [fieldId]: nextFieldFiles,
      };
    });
  };

  const renderField = (field: NormalizedServiceField) => {
    if (isValueField(field)) {
      return (
        <div key={field.id} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedValues[field.id] || ""}
            disabled={field.values.length === 0}
            onChange={(event) =>
              setSelectedValues((previous) => ({
                ...previous,
                [field.id]: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-950 outline-none transition-all focus:border-neutral-950 disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            <option value="">Bitte waehlen...</option>
            {field.values.map((value) => (
              <option key={value.id} value={value.id}>
                {value.label}
                {value.price > 0 ? ` (+${value.price.toFixed(2)} EUR)` : ""}
              </option>
            ))}
          </select>
          {field.helperText && (
            <p className="text-xs leading-6 text-neutral-500">{field.helperText}</p>
          )}
        </div>
      );
    }

    if (isTextInputField(field)) {
      return (
        <div key={field.id} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={field.kind === "number" ? "number" : "text"}
            value={textFieldValues[field.id] || ""}
            onChange={(event) =>
              setTextFieldValues((previous) => ({
                ...previous,
                [field.id]: event.target.value,
              }))
            }
            placeholder={field.placeholder || field.label}
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-950 outline-none transition-all focus:border-neutral-950"
          />
          {field.helperText && (
            <p className="text-xs leading-6 text-neutral-500">{field.helperText}</p>
          )}
        </div>
      );
    }

    if (isFileField(field)) {
      const currentFile = optionFileValues[field.id];

      return (
        <div key={field.id} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>

          {!currentFile ? (
            <label className="group flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 transition-all hover:bg-neutral-100">
              <Upload className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-950" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500 transition-colors group-hover:text-neutral-950">
                Datei auswaehlen
              </span>
              <input
                type="file"
                className="hidden"
                accept={field.accept}
                onChange={(event) => handleOptionFileUpload(event, field.id)}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-950 p-4 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {currentFile.name}
                  </span>
                  <span className="text-xs text-neutral-300">
                    {(currentFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setOptionFileValues((previous) => {
                    const nextValues = { ...previous };
                    delete nextValues[field.id];
                    return nextValues;
                  })
                }
                className="rounded-full p-1 text-neutral-300 transition-colors hover:text-white"
                aria-label={`${field.label} entfernen`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {field.helperText && (
            <p className="text-xs leading-6 text-neutral-500">{field.helperText}</p>
          )}
        </div>
      );
    }

    return null;
  };

  const renderUploadField = (field: NormalizedUploadField) => {
    const selectedFilesCount = getUploadFieldFilesCount(uploadFieldFiles, field.id);

    return (
      <div
        key={field.id}
        className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 md:p-5"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              {selectedFilesCount > 0
                ? `${selectedFilesCount} hochgeladen`
                : "Noch keine Datei"}
            </span>
          </div>
          {field.helperText && (
            <p className="text-xs leading-6 text-neutral-500">{field.helperText}</p>
          )}
          <p className="text-xs leading-6 text-neutral-400">
            {getUploadFieldStatusText(field)}
          </p>
        </div>

        <div className="space-y-3">
          {Array.from({ length: field.maxFiles }).map((_, slotIndex) => {
            const currentFile = getUploadFieldFile(uploadFieldFiles, field.id, slotIndex);
            const slotLabel =
              field.maxFiles > 1 ? `${field.label} ${slotIndex + 1}` : field.label;

            return (
              <div key={`${field.id}-${slotIndex}`} className="space-y-3">
                {!currentFile ? (
                  <label className="group flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 transition-all hover:bg-neutral-100">
                    <Upload className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-950" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500 transition-colors group-hover:text-neutral-950">
                      {field.maxFiles > 1
                        ? `${slotLabel} auswaehlen`
                        : "Datei auswaehlen"}
                    </span>
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
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-950 p-4 text-white">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {currentFile.name}
                          </span>
                          <span className="text-xs text-neutral-300">
                            {(currentFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeConfiguredUpload(field.id, slotIndex)}
                        className="rounded-full p-1 text-neutral-300 transition-colors hover:text-white"
                        aria-label={`${slotLabel} entfernen`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {field.allowCustomerFileLabel && (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                          Eigene Dateibezeichnung
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
                          placeholder="Zum Beispiel Vorderseite Logo final"
                          className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-950 outline-none transition-all focus:border-neutral-950"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleAddToCart = () => {
    if (isQuoteOnly) {
      return;
    }

    const missing = config.fields
      .filter((field) => field.required)
      .filter((field) => {
        if (isValueField(field)) {
          return !selectedValues[field.id];
        }

        if (isTextInputField(field)) {
          return !textFieldValues[field.id]?.trim();
        }

        if (isFileField(field)) {
          return !optionFileValues[field.id];
        }

        return false;
      })
      .map((field) => field.label);

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

    config.uploadSettings.fields.forEach((field) => {
      if (field.required && getUploadFieldFilesCount(uploadFieldFiles, field.id) === 0) {
        missing.push(field.label);
      }
    });

    if (missing.length > 0) {
      return alert(`Bitte waehlen Sie: ${missing.join(", ")}`);
    }

    const richOptions: Record<
      string,
      { optionName: string; valueName: string; price: number }
    > = {};
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
        if (!value) return;

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
        if (!fileValue) return;

        textInputs[field.key] = {
          optionName: field.label,
          value: fileValue.name,
          url: fileValue.url,
        };

        snapshotUploadFields.push({
          fieldKey: field.key,
          fieldLabel: field.label,
          files: [
            {
              fileName: fileValue.name,
              customerLabel: null,
              fileType: fileValue.fileType || null,
              fileSize: fileValue.sizeBytes,
              fileUrl: fileValue.url,
            },
          ],
        });
      }
    });

    const selectedTier =
      config.pricing.mode === "quantity_tiers"
        ? config.pricing.quantityTiers.find(
            (tier) => tier.id === priceResult.selectedTierId,
          ) ?? null
        : null;

    if (config.pricing.mode === "quantity_tiers") {
      if (selectedTier) {
        textInputs.pricing_model = {
          optionName: "Preismodell",
          value: "Mengenstaffel",
        };
        textInputs.pricing_tier = {
          optionName: "Mengenstaffel",
          value: selectedTier.label,
        };
      }
    }

    if (config.pricing.mode === "area" && config.pricing.area) {
      textInputs.pricing_model = {
        optionName: "Preismodell",
        value: "Flaechenpreis",
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
        optionName: "Flaeche",
        value: `${priceResult.billableAreaSqm.toFixed(3)} m2`,
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
            url: file.url,
          };

          if (field.allowCustomerFileLabel && file.customerLabel.trim() !== "") {
            textInputs[`${baseKey}_label`] = {
              optionName: `${optionName} Label`,
              value: file.customerLabel.trim(),
            };
          }

          return {
            fileName: file.name,
            customerLabel:
              field.allowCustomerFileLabel && file.customerLabel.trim() !== ""
                ? file.customerLabel.trim()
                : null,
            fileType: null,
            fileSize: file.sizeBytes,
            fileUrl: file.url,
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

    const normalizedDesignData =
      config.designSettings.enabled && designData ? designData : undefined;
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
    });

    setIsAdded(true);
    setTimeout(() => router.push("/cart"), 800);
  };

  return (
    <div className="sticky top-24 space-y-5 rounded-[32px] border border-neutral-200 bg-white p-4 shadow-xl md:p-5">
      <div className="rounded-[28px] bg-neutral-950 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-300">
              Konfigurator
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              {isQuoteOnly ? "Anfragekonfiguration" : "Live-Preis und Auswahl"}
            </h2>
          </div>
          <span className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
            {pricingModeLabel}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-300">
            Aktueller Status
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            {isQuoteOnly ? "Preis auf Anfrage" : formatCurrency(priceResult.total)}
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-neutral-300">
            {isQuoteOnly
              ? "Diese Leistung bleibt anfragebasiert. Die Konfiguration wird sichtbar vorbereitet, aber es wird kein automatischer Preis ausgegeben."
              : "Ihre Auswahl, Uploads und Preisdetails werden laufend in einer klaren Zusammenfassung dargestellt."}
          </p>
        </div>
      </div>

      {config.designSettings.allowSecondaryColorPicker &&
        designData &&
        setDesignData && (
          <ConfigSection
            icon={<Palette className="h-4 w-4" />}
            eyebrow="Darstellung"
            title="Produktfarbe"
            description="Waehlen Sie die passende Grundfarbe fuer die Vorschau."
          >
            <div className="flex flex-wrap gap-3">
              {COMMON_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setDesignData({ ...designData, color: color.hex })}
                  className={`flex items-center gap-3 rounded-full border px-3 py-2 transition-all ${
                    designData.color === color.hex
                      ? "border-neutral-950 bg-white shadow-sm"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full border border-neutral-200"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-700">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </ConfigSection>
        )}

      <ConfigSection
        icon={<Layers3 className="h-4 w-4" />}
        eyebrow="Preis"
        title="Preis und Modell"
        description="Die Preislogik bleibt unveraendert, wird aber klarer dargestellt."
      >
        {config.pricing.mode === "custom_quote" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-800">
                  Preis auf Anfrage
                </p>
                <p className="text-sm leading-6 text-amber-900">
                  Fuer diese Leistung gibt es bewusst keinen automatischen
                  Verkaufspreis. Konfigurieren Sie alle relevanten Angaben, damit
                  spaeter eine saubere Anfragegrundlage vorliegt.
                </p>
              </div>
            </div>
            <SummaryRow label="Preisstatus" value="Auf Anfrage" emphasize />
          </div>
        ) : config.pricing.mode === "quantity_tiers" ? (
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
              <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                Mengenstaffel
              </label>
              <select
                value={selectedQuantityTierId}
                onChange={(event) => setSelectedQuantityTierId(event.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-950 outline-none transition-all focus:border-neutral-950"
              >
                {config.pricing.quantityTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.label} ({formatCurrency(tier.price)})
                  </option>
                ))}
              </select>
              <p className="text-xs leading-6 text-neutral-500">
                Der ausgewaehlte Staffelpreis gilt pro Set. Die Mengensteuerung in
                der Zusammenfassung multipliziert komplette Sets.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryRow
                label="Ausgewaehlte Staffel"
                value={priceResult.selectedTierLabel ?? "Noch nicht gewaehlt"}
              />
              <SummaryRow
                label="Preis pro Set"
                value={formatCurrency(priceResult.baseUnitPrice)}
              />
            </div>
          </div>
        ) : config.pricing.mode === "area" && config.pricing.area ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
                <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                  {config.pricing.area.widthLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={widthCm}
                  onChange={(event) => setWidthCm(event.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-950 outline-none transition-all focus:border-neutral-950"
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
                <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                  {config.pricing.area.heightLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={heightCm}
                  onChange={(event) => setHeightCm(event.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-950 outline-none transition-all focus:border-neutral-950"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryRow
                label="Preis pro m2"
                value={formatCurrency(config.pricing.area.pricePerSqm)}
              />
              <SummaryRow
                label="Berechnete Flaeche"
                value={`${priceResult.areaSqm.toFixed(3)} m2`}
              />
              <SummaryRow
                label="Abgerechnete Flaeche"
                value={`${priceResult.billableAreaSqm.toFixed(3)} m2`}
              />
              <SummaryRow
                label="Zwischensumme"
                value={formatCurrency(priceResult.baseUnitPrice)}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryRow
              label="Startpreis"
              value={formatCurrency(priceResult.basePrice)}
            />
            <SummaryRow
              label="Aktuelle Aufpreise"
              value={formatCurrency(priceResult.optionPriceImpact)}
            />
            <SummaryRow
              label="Zwischensumme"
              value={formatCurrency(priceResult.baseUnitPrice + priceResult.optionPriceImpact)}
            />
          </div>
        )}
      </ConfigSection>

      {sizeFields.length > 0 && (
        <ConfigSection
          icon={<Ruler className="h-4 w-4" />}
          eyebrow="Groesse"
          title="Groesse und Varianten"
          description="Pflichtfelder und Varianten bleiben unveraendert, sind aber klarer gruppiert."
        >
          <div className="space-y-4">{sizeFields.map(renderField)}</div>
        </ConfigSection>
      )}

      {generalFields.length > 0 && (
        <ConfigSection
          icon={<Layers3 className="h-4 w-4" />}
          eyebrow="Optionen"
          title="Optionen und Angaben"
          description="Waehlen Sie alle gewuenschten Varianten und erfassen Sie zusaetzliche Angaben."
        >
          <div className="space-y-4">{generalFields.map(renderField)}</div>
        </ConfigSection>
      )}

      {hasUploadSection && (
        <ConfigSection
          icon={<Upload className="h-4 w-4" />}
          eyebrow="Uploads"
          title="Dateien und Uploads"
          description="Alle Uploadfelder zeigen Hilfetexte, Dateiformate und Limits direkt im Formular."
        >
          <div className="space-y-4">
            {fileFields.map(renderField)}
            {config.uploadSettings.fields.map(renderUploadField)}
          </div>
        </ConfigSection>
      )}

      <ConfigSection
        icon={<FileText className="h-4 w-4" />}
        eyebrow="Hinweise"
        title="Projektanmerkungen"
        description="Nutzen Sie dieses Feld fuer Sonderwuensche, Produktionshinweise oder Rueckfragen."
      >
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
            Anmerkungen
          </label>
          <textarea
            value={orderNotes}
            onChange={(event) => setOrderNotes(event.target.value)}
            placeholder="Zusaetzliche Infos..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-950 outline-none transition-all focus:border-neutral-950"
          />
        </div>
      </ConfigSection>

      <ConfigSection
        icon={<ShoppingCart className="h-4 w-4" />}
        eyebrow={isQuoteOnly ? "Anfrage" : "Zusammenfassung"}
        title={isQuoteOnly ? "Preisstatus" : "Finale Zusammenfassung"}
        description={
          isQuoteOnly
            ? "Die Leistung bleibt als Anfrageprodukt markiert. Die aktuelle Konfiguration wird nicht in den Warenkorb gelegt."
            : "Kontrollieren Sie Menge, Gesamtpreis und alle Pflichtangaben vor dem Hinzufuegen."
        }
      >
        <div className="space-y-4">
          {isQuoteOnly ? (
            <div className="space-y-3">
              <SummaryRow label="Preismodell" value={pricingModeLabel} />
              <SummaryRow label="Preisstatus" value="Auf Anfrage" emphasize />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                    Menge / Sets
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Diese Steuerung bleibt mit dem bestehenden Warenkorbverhalten kompatibel.
                  </p>
                </div>
                <div className="flex items-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-neutral-400 transition-colors hover:text-neutral-950"
                    aria-label="Menge verringern"
                  >
                    -
                  </button>
                  <span className="min-w-[48px] px-4 py-2 text-center text-sm font-bold text-neutral-950">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-neutral-400 transition-colors hover:text-neutral-950"
                    aria-label="Menge erhoehen"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <SummaryRow label="Preismodell" value={pricingModeLabel} />
                {config.pricing.mode === "quantity_tiers" && priceResult.selectedTierLabel && (
                  <SummaryRow
                    label="Ausgewaehlte Staffel"
                    value={priceResult.selectedTierLabel}
                  />
                )}
                {config.pricing.mode === "area" && config.pricing.area && (
                  <>
                    <SummaryRow
                      label={config.pricing.area.widthLabel}
                      value={`${formatDisplayNumber(priceResult.widthCm)} cm`}
                    />
                    <SummaryRow
                      label={config.pricing.area.heightLabel}
                      value={`${formatDisplayNumber(priceResult.heightCm)} cm`}
                    />
                    <SummaryRow
                      label="Flaeche"
                      value={`${priceResult.billableAreaSqm.toFixed(3)} m2`}
                    />
                  </>
                )}
                <SummaryRow
                  label="Aufpreise"
                  value={formatCurrency(priceResult.optionPriceImpact)}
                />
                <SummaryRow
                  label="Gesamtpreis"
                  value={formatCurrency(priceResult.total)}
                  emphasize
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdded || isQuoteOnly}
            className={`flex w-full items-center justify-center gap-3 rounded-[20px] px-8 py-5 text-[11px] font-bold uppercase tracking-[0.22em] transition-all ${
              isAdded
                ? "bg-green-600 text-white"
                : isQuoteOnly
                  ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                  : "bg-neutral-950 text-white hover:bg-neutral-800"
            }`}
          >
            {isAdded ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <ShoppingCart className="h-5 w-5" />
            )}
            {isAdded
              ? "Im Warenkorb"
              : isQuoteOnly
                ? "Preis auf Anfrage"
                : "In den Warenkorb"}
          </button>
        </div>
      </ConfigSection>
    </div>
  );
}
