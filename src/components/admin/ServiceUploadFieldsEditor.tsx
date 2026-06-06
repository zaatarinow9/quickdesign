"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash, Upload } from "lucide-react";
import {
  MAX_SERVER_ACTION_UPLOAD_MB,
  getEffectiveUploadLimitMb,
  isUploadLimitCapped,
} from "@/lib/storage/upload-limits";

type UploadFieldRow = {
  id: string;
  label: string;
  key: string;
  helperText: string;
  required: boolean;
  allowedFileTypesText: string;
  maxFiles: string;
  maxFileSizeMb: string;
  allowCustomerFileLabel: boolean;
  order: string;
};

type UploadConfigPayload = {
  uploadFields?: {
    label: string;
    key: string;
    helperText?: string;
    required: boolean;
    allowedFileTypesText: string;
    accept: string;
    maxFiles: number;
    maxFileSizeMb?: number;
    allowCustomerFileLabel: boolean;
    order: number;
  }[];
};

type UploadFieldConfig = NonNullable<UploadConfigPayload["uploadFields"]>[number];

interface Props {
  initialConfigJson?: string | null;
  onPreviewChange?: (preview: ServiceUploadPreview) => void;
}

export type ServiceUploadPreview = {
  enabled: boolean;
  fieldCount: number;
  summaryLines: string[];
};

function createFieldId(seed: number): string {
  return `upload-field-${seed}`;
}

function createEmptyUploadField(seed: number): UploadFieldRow {
  return {
    id: createFieldId(seed),
    label: "",
    key: "",
    helperText: "",
    required: false,
    allowedFileTypesText: "pdf, ai, eps, png, jpg",
    maxFiles: "1",
    maxFileSizeMb: "",
    allowCustomerFileLabel: false,
    order: String(seed),
  };
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

function normalizeAcceptString(value: string): string {
  const segments = value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");

  if (segments.length === 0) {
    return "*/*";
  }

  const normalizedSegments = segments.map((segment) => {
    if (segment === "*/*" || segment.endsWith("/*")) {
      return segment;
    }

    if (segment.startsWith(".")) {
      return segment.toLowerCase();
    }

    if (segment.includes("/")) {
      return segment.toLowerCase();
    }

    return `.${segment.toLowerCase()}`;
  });

  return normalizedSegments.join(",");
}

function parseInitialState(
  initialConfigJson: string | null | undefined,
): {
  useCustomUploadFields: boolean;
  uploadFields: UploadFieldRow[];
} {
  if (!initialConfigJson) {
    return {
      useCustomUploadFields: false,
      uploadFields: [createEmptyUploadField(1)],
    };
  }

  try {
    const parsedValue: unknown = JSON.parse(initialConfigJson);
    if (!isRecord(parsedValue)) {
      return {
        useCustomUploadFields: false,
        uploadFields: [createEmptyUploadField(1)],
      };
    }

    const hasExplicitUploadFields = Object.prototype.hasOwnProperty.call(
      parsedValue,
      "uploadFields",
    );
    const rawUploadFields = parsedValue.uploadFields;

    if (!hasExplicitUploadFields || !Array.isArray(rawUploadFields)) {
      return {
        useCustomUploadFields: false,
        uploadFields: [createEmptyUploadField(1)],
      };
    }

    const uploadFields = rawUploadFields
      .map((field, index) => {
        if (!isRecord(field)) {
          return null;
        }

        const label = normalizeOptionalString(
          typeof field.label === "string" ? field.label : "",
        );
        const allowedFileTypesText = normalizeOptionalString(
          typeof field.allowedFileTypesText === "string"
            ? field.allowedFileTypesText
            : typeof field.allowedFileTypes === "string"
              ? field.allowedFileTypes
              : "",
        );
        const maxFiles = parsePositiveInteger(field.maxFiles) ?? 1;
        const maxFileSizeMb = parseFiniteNumber(field.maxFileSizeMb);
        const order = parsePositiveInteger(field.order) ?? index + 1;

        return {
          id: createFieldId(index + 1),
          label,
          key: normalizeOptionalString(
            typeof field.key === "string" ? field.key : "",
          ),
          helperText: normalizeOptionalString(
            typeof field.helperText === "string" ? field.helperText : "",
          ),
          required: typeof field.required === "boolean" ? field.required : false,
          allowedFileTypesText: allowedFileTypesText || "pdf, ai, eps, png, jpg",
          maxFiles: String(maxFiles),
          maxFileSizeMb:
            maxFileSizeMb !== null && maxFileSizeMb > 0
              ? String(maxFileSizeMb)
              : "",
          allowCustomerFileLabel:
            typeof field.allowCustomerFileLabel === "boolean"
              ? field.allowCustomerFileLabel
              : false,
          order: String(order),
        } satisfies UploadFieldRow;
      })
      .filter((field): field is UploadFieldRow => field !== null)
      .sort((left, right) => Number(left.order) - Number(right.order));

    return {
      useCustomUploadFields: true,
      uploadFields:
        uploadFields.length > 0 ? uploadFields : [createEmptyUploadField(1)],
    };
  } catch {
    return {
      useCustomUploadFields: false,
      uploadFields: [createEmptyUploadField(1)],
    };
  }
}

function buildUploadConfigJson(
  useCustomUploadFields: boolean,
  uploadFields: UploadFieldRow[],
): string {
  if (!useCustomUploadFields) {
    return "";
  }

  const payload: UploadConfigPayload = {
    uploadFields: uploadFields
      .map((field, index): UploadFieldConfig | null => {
        const label = normalizeOptionalString(field.label);
        if (!label) {
          return null;
        }

        const maxFiles = parsePositiveInteger(field.maxFiles) ?? 1;
        const maxFileSizeMb = parseFiniteNumber(field.maxFileSizeMb);
        const order = parsePositiveInteger(field.order) ?? index + 1;
        const allowedFileTypesText =
          normalizeOptionalString(field.allowedFileTypesText) || "pdf, ai, eps, png, jpg";
        const key =
          normalizeOptionalString(field.key) ||
          label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "") ||
          `upload_${index + 1}`;
        const helperText = normalizeOptionalString(field.helperText);
        const uploadField: UploadFieldConfig = {
          label,
          key,
          required: field.required,
          allowedFileTypesText,
          accept: normalizeAcceptString(allowedFileTypesText),
          maxFiles,
          allowCustomerFileLabel: field.allowCustomerFileLabel,
          order,
        };

        if (helperText) {
          uploadField.helperText = helperText;
        }

        if (maxFileSizeMb !== null && maxFileSizeMb > 0) {
          uploadField.maxFileSizeMb = maxFileSizeMb;
        }

        return uploadField;
      })
      .filter((field): field is UploadFieldConfig => field !== null),
  };

  return JSON.stringify(payload);
}

function buildUploadPreview(
  useCustomUploadFields: boolean,
  uploadFields: UploadFieldRow[],
): ServiceUploadPreview {
  if (!useCustomUploadFields) {
    return {
      enabled: false,
      fieldCount: 0,
      summaryLines: [
        "Legacy-Fallback ueber fileLimit bleibt aktiv.",
        `Checkout-Limit aktuell: ${MAX_SERVER_ACTION_UPLOAD_MB} MB pro Datei.`,
      ],
    };
  }

  const activeFields = uploadFields.filter((field) => field.label.trim() !== "");
  const summaryLines =
    activeFields.length === 0
      ? ["Noch keine Upload-Felder definiert."]
      : activeFields.map((field) => {
          const effectiveLimitMb = getEffectiveUploadLimitMb(
            parseFiniteNumber(field.maxFileSizeMb),
          );
          const maxFiles = parsePositiveInteger(field.maxFiles) ?? 1;

          return `${field.label}: ${maxFiles} Datei${
            maxFiles === 1 ? "" : "en"
          }, max. ${effectiveLimitMb} MB`;
        });

  return {
    enabled: activeFields.length > 0,
    fieldCount: activeFields.length,
    summaryLines,
  };
}

export default function ServiceUploadFieldsEditor({
  initialConfigJson,
  onPreviewChange,
}: Props) {
  const initialState = useMemo(
    () => parseInitialState(initialConfigJson),
    [initialConfigJson],
  );
  const [useCustomUploadFields, setUseCustomUploadFields] = useState<boolean>(
    initialState.useCustomUploadFields,
  );
  const [uploadFields, setUploadFields] = useState<UploadFieldRow[]>(
    initialState.uploadFields,
  );

  const uploadConfigJson = useMemo(
    () => buildUploadConfigJson(useCustomUploadFields, uploadFields),
    [uploadFields, useCustomUploadFields],
  );
  const uploadPreview = useMemo(
    () => buildUploadPreview(useCustomUploadFields, uploadFields),
    [uploadFields, useCustomUploadFields],
  );

  useEffect(() => {
    onPreviewChange?.(uploadPreview);
  }, [onPreviewChange, uploadPreview]);

  const addUploadField = () => {
    setUploadFields((current) => [
      ...current,
      createEmptyUploadField(current.length + 1),
    ]);
  };

  const removeUploadField = (fieldId: string) => {
    setUploadFields((current) => {
      if (current.length === 1) {
        return [createEmptyUploadField(1)];
      }

      return current.filter((field) => field.id !== fieldId);
    });
  };

  const updateUploadField = <K extends keyof Omit<UploadFieldRow, "id">>(
    fieldId: string,
    key: K,
    value: UploadFieldRow[K],
  ) => {
    setUploadFields((current) =>
      current.map((field) =>
        field.id === fieldId ? { ...field, [key]: value } : field,
      ),
    );
  };

  return (
    <section className="space-y-8">
      <input type="hidden" name="uploadConfigJson" value={uploadConfigJson} />
      <input
        type="hidden"
        name="useCustomUploadFields"
        value={useCustomUploadFields ? "true" : "false"}
      />

      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-100">
          Datei-Uploads
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
          Definiert service-spezifische Dateianforderungen. Wenn deaktiviert,
          bleibt der Legacy-Fallback aus fileLimit bestehen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/80 dark:bg-amber-950/40">
          <p className="text-xs font-medium tracking-[0.08em] text-amber-700 dark:text-amber-200">
            Effektives Limit
          </p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {MAX_SERVER_ACTION_UPLOAD_MB} MB pro Datei
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60 md:col-span-2">
          <p className="text-xs font-medium tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Vorschau
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadPreview.summaryLines.map((line) => (
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

      <div className="flex min-h-[60px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950">
        <input
          id="custom-upload-fields"
          type="checkbox"
          checked={useCustomUploadFields}
          onChange={(event) => setUseCustomUploadFields(event.target.checked)}
          className="h-5 w-5 accent-slate-950 dark:accent-slate-100"
        />
        <label
          htmlFor="custom-upload-fields"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Eigene Upload-Felder verwenden
        </label>
      </div>

      {!useCustomUploadFields ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
          Ohne eigene Upload-Felder verwendet die Store-Seite weiterhin den
          bestehenden Legacy-Fallback aus fileLimit und Standard-Uploads.
        </div>
      ) : (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                Upload-Anforderungen
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                Beispiele: Front design, Back design, Logo file, Print-ready PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={addUploadField}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Feld hinzufuegen
            </button>
          </div>

          <div className="space-y-6">
            {uploadFields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/70"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      <Upload className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                        Upload-Feld #{index + 1}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-300">
                        Kunden-Dateien fuer diesen Service.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUploadField(field.id)}
                    className="rounded-2xl p-3 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    aria-label={`Upload-Feld ${index + 1} entfernen`}
                  >
                    <Trash className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Feldname
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(event) =>
                        updateUploadField(field.id, "label", event.target.value)
                      }
                      placeholder="z. B. Front design"
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Feld-Key
                    </label>
                    <input
                      type="text"
                      value={field.key}
                      onChange={(event) =>
                        updateUploadField(field.id, "key", event.target.value)
                      }
                      placeholder="front_design"
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Kundenhinweis
                  </label>
                  <input
                    type="text"
                    value={field.helperText}
                    onChange={(event) =>
                      updateUploadField(field.id, "helperText", event.target.value)
                    }
                    placeholder="Kurzer Hinweis fuer Dateivorgaben"
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-300"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Erlaubte Dateitypen
                    </label>
                    <input
                      type="text"
                      value={field.allowedFileTypesText}
                      onChange={(event) =>
                        updateUploadField(
                          field.id,
                          "allowedFileTypesText",
                          event.target.value,
                        )
                      }
                      placeholder="pdf, ai, eps, png, jpg"
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Reihenfolge
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={field.order}
                      onChange={(event) =>
                        updateUploadField(field.id, "order", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Maximale Dateien
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={field.maxFiles}
                      onChange={(event) =>
                        updateUploadField(field.id, "maxFiles", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Maximale Dateigroesse
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={field.maxFileSizeMb}
                      onChange={(event) =>
                        updateUploadField(
                          field.id,
                          "maxFileSizeMb",
                          event.target.value,
                        )
                      }
                      placeholder="optional"
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-300">
                      Maximale Dateigroesse im Checkout:{" "}
                      {getEffectiveUploadLimitMb(
                        parseFiniteNumber(field.maxFileSizeMb),
                      )}{" "}
                      MB pro Datei
                    </p>
                    {isUploadLimitCapped(parseFiniteNumber(field.maxFileSizeMb)) && (
                      <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-200">
                        Aktuelles Upload-Limit im Checkout:{" "}
                        {MAX_SERVER_ACTION_UPLOAD_MB} MB
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Optionen
                    </label>
                    <label className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) =>
                          updateUploadField(
                            field.id,
                            "required",
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4 accent-slate-950 dark:accent-slate-100"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Pflichtfeld
                      </span>
                    </label>
                    <label className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={field.allowCustomerFileLabel}
                        onChange={(event) =>
                          updateUploadField(
                            field.id,
                            "allowCustomerFileLabel",
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4 accent-slate-950 dark:accent-slate-100"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Kundenlabel
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
