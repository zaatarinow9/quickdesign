"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
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
  const [textFieldValues, setTextFieldValues] = useState<Record<string, string>>({});
  const [optionFileValues, setOptionFileValues] = useState<Record<string, OptionUploadPreview>>({});
  const [uploadFieldFiles, setUploadFieldFiles] = useState<UploadFieldFileMap>({});
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
        <div key={field.id} className="space-y-3">
          <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest block">
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
            className="w-full border border-neutral-200 p-4 text-xs font-bold uppercase bg-neutral-50 outline-none focus:border-neutral-950 transition-all cursor-pointer disabled:cursor-not-allowed disabled:text-neutral-400"
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
            <p className="text-[11px] text-neutral-500">{field.helperText}</p>
          )}
        </div>
      );
    }

    if (isTextInputField(field)) {
      return (
        <div key={field.id} className="space-y-3">
          <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest block">
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
            className="w-full border border-neutral-200 p-4 text-xs font-bold bg-neutral-50 outline-none focus:border-neutral-950 transition-all"
          />
          {field.helperText && (
            <p className="text-[11px] text-neutral-500">{field.helperText}</p>
          )}
        </div>
      );
    }

    if (isFileField(field)) {
      const currentFile = optionFileValues[field.id];

      return (
        <div key={field.id} className="space-y-3">
          <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest block">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>

          {!currentFile ? (
            <label className="flex items-center justify-center gap-3 border-2 border-dashed border-neutral-200 p-5 hover:bg-neutral-50 cursor-pointer transition-all rounded-sm group">
              <Upload className="w-4 h-4 text-neutral-400 group-hover:text-neutral-950" />
              <span className="text-[10px] font-bold uppercase text-neutral-500 group-hover:text-neutral-950">
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
            <div className="flex items-center justify-between bg-neutral-950 p-4 text-white rounded-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-bold truncate">{currentFile.name}</span>
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
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {field.helperText && (
            <p className="text-[11px] text-neutral-500">{field.helperText}</p>
          )}
        </div>
      );
    }

    return null;
  };

  const renderUploadField = (field: NormalizedUploadField) => {
    const selectedFilesCount = getUploadFieldFilesCount(uploadFieldFiles, field.id);

    return (
      <div key={field.id} className="space-y-4 border border-neutral-200 bg-neutral-50 p-5">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest block">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.helperText && (
            <p className="text-[11px] text-neutral-500">{field.helperText}</p>
          )}
          <p className="text-[11px] text-neutral-400">{getUploadFieldStatusText(field)}</p>
          {selectedFilesCount > 0 && (
            <p className="text-[11px] text-neutral-500">
              Hochgeladen: {selectedFilesCount}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {Array.from({ length: field.maxFiles }).map((_, slotIndex) => {
            const currentFile = getUploadFieldFile(uploadFieldFiles, field.id, slotIndex);
            const slotLabel =
              field.maxFiles > 1 ? `${field.label} ${slotIndex + 1}` : field.label;

            return (
              <div key={`${field.id}-${slotIndex}`} className="space-y-3">
                {!currentFile ? (
                  <label className="flex items-center justify-center gap-3 border-2 border-dashed border-neutral-200 p-5 hover:bg-white cursor-pointer transition-all rounded-sm group bg-white">
                    <Upload className="w-4 h-4 text-neutral-400 group-hover:text-neutral-950" />
                    <span className="text-[10px] font-bold uppercase text-neutral-500 group-hover:text-neutral-950">
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
                    <div className="flex items-center justify-between bg-neutral-950 p-4 text-white rounded-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-4 h-4 shrink-0" />
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-bold truncate block">
                            {currentFile.name}
                          </span>
                          <span className="text-[10px] text-neutral-300">
                            {(currentFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeConfiguredUpload(field.id, slotIndex)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {field.allowCustomerFileLabel && (
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
                        placeholder="Eigene Dateibezeichnung"
                        className="w-full border border-neutral-200 p-4 text-xs font-bold bg-white outline-none focus:border-neutral-950 transition-all"
                      />
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
    <div className="bg-white border border-neutral-200 p-8 shadow-sm sticky top-24 space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="border-b border-neutral-100 pb-6">
        <h2 className="text-xl font-bold text-neutral-950 uppercase tracking-tighter">
          Konfiguration
        </h2>
      </div>

      {config.designSettings.allowSecondaryColorPicker && designData && setDesignData && (
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <Palette className="w-3 h-3" /> Produktfarbe
          </label>
          <div className="flex flex-wrap gap-3">
            {COMMON_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => setDesignData({ ...designData, color: color.hex })}
                className={`w-8 h-8 rounded-full border-2 transition-all ${designData.color === color.hex ? "border-neutral-950 scale-110 shadow-lg" : "border-neutral-100"}`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>
      )}

      {config.pricing.mode === "quantity_tiers" && (
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest flex items-center gap-2">
            <Layers3 className="w-3 h-3" /> Mengenstaffel
          </label>
          <select
            value={selectedQuantityTierId}
            onChange={(event) => setSelectedQuantityTierId(event.target.value)}
            className="w-full border border-neutral-200 p-4 text-xs font-bold uppercase bg-neutral-50 outline-none focus:border-neutral-950 transition-all cursor-pointer"
          >
            {config.pricing.quantityTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.label} ({formatCurrency(tier.price)})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-500">
            Der gewaehlte Staffelpreis gilt pro Set. Die Mengensteuerung darunter
            multipliziert komplette Sets.
          </p>
        </div>
      )}

      {config.pricing.mode === "area" && config.pricing.area && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-950 uppercase tracking-widest">
            <Ruler className="w-3 h-3" /> Flaechenberechnung
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest block">
                {config.pricing.area.widthLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={widthCm}
                onChange={(event) => setWidthCm(event.target.value)}
                placeholder="0"
                className="w-full border border-neutral-200 p-4 text-xs font-bold bg-neutral-50 outline-none focus:border-neutral-950 transition-all"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest block">
                {config.pricing.area.heightLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                placeholder="0"
                className="w-full border border-neutral-200 p-4 text-xs font-bold bg-neutral-50 outline-none focus:border-neutral-950 transition-all"
              />
            </div>
          </div>
          <div className="bg-neutral-50 border border-neutral-100 p-4 text-xs text-neutral-600 space-y-1">
            <p>Preis pro m2: {formatCurrency(config.pricing.area.pricePerSqm)}</p>
            <p>
              Berechnete Flaeche: {priceResult.areaSqm.toFixed(3)} m2
              {priceResult.billableAreaSqm > priceResult.areaSqm
                ? `, Mindestflaeche aktiv: ${priceResult.billableAreaSqm.toFixed(3)} m2`
                : ""}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">{config.fields.map(renderField)}</div>

      {config.uploadSettings.enabled && (
        <div className="space-y-6">
          <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest block">
            Uploads
          </label>
          <div className="space-y-4">
            {config.uploadSettings.fields.map(renderUploadField)}
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-widest block mb-3">
          Anmerkungen
        </label>
        <textarea
          value={orderNotes}
          onChange={(event) => setOrderNotes(event.target.value)}
          placeholder="Zusaetzliche Infos..."
          rows={2}
          className="w-full border border-neutral-200 p-4 outline-none focus:border-neutral-950 text-xs bg-neutral-50 resize-none"
        />
      </div>

      <div className="pt-8 border-t border-neutral-100 space-y-6">
        {isQuoteOnly ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 p-5">
              <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                  Preis auf Anfrage
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Fuer diese Leistung wird aktuell kein automatischer Preis
                  berechnet. Bitte nutzen Sie diesen Modus vorerst nur zur
                  Konfiguration; ein vollstaendiger Anfrage-Workflow folgt in
                  einer spaeteren Phase.
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center bg-neutral-50 p-6 border border-neutral-100">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Preisstatus
              </span>
              <span className="text-2xl font-bold text-neutral-950 tracking-tighter">
                Auf Anfrage
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Menge / Sets
              </label>
              <div className="flex items-center border border-neutral-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-5 py-2 text-neutral-400 hover:text-neutral-950 transition-colors border-r border-neutral-100"
                >
                  -
                </button>
                <span className="px-6 py-2 text-xs font-bold min-w-[50px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-5 py-2 text-neutral-400 hover:text-neutral-950 transition-colors border-l border-neutral-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center bg-neutral-50 p-6 border border-neutral-100">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Gesamtpreis
              </span>
              <span className="text-4xl font-bold text-neutral-950 tracking-tighter">
                {formatCurrency(priceResult.total)}
              </span>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdded || isQuoteOnly}
          className={`w-full flex items-center justify-center gap-3 px-8 py-6 font-bold uppercase tracking-widest text-[11px] transition-all shadow-2xl ${isAdded ? "bg-green-600 text-white" : isQuoteOnly ? "bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-none" : "bg-neutral-950 text-white hover:bg-neutral-800"}`}
        >
          {isAdded ? <CheckCircle2 className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
          {isAdded
            ? "Im Warenkorb"
            : isQuoteOnly
              ? "Preis auf Anfrage"
              : "In den Warenkorb"}
        </button>
      </div>
    </div>
  );
}
