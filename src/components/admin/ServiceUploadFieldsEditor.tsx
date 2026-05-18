"use client";

import { useMemo, useState } from "react";
import { Plus, Trash, Upload } from "lucide-react";

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
}

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

export default function ServiceUploadFieldsEditor({
  initialConfigJson,
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

      <div className="pb-4 border-b border-neutral-100">
        <h2 className="text-sm font-bold text-neutral-950 uppercase tracking-widest">
          Upload Fields
        </h2>
        <p className="text-sm text-neutral-500 mt-2">
          Definiert service-spezifische Dateianforderungen. Wenn deaktiviert,
          bleibt der Legacy-Fallback aus fileLimit bestehen.
        </p>
      </div>

      <div className="flex items-center gap-4 min-h-[54px] px-4 border border-neutral-200 bg-neutral-50">
        <input
          id="custom-upload-fields"
          type="checkbox"
          checked={useCustomUploadFields}
          onChange={(event) => setUseCustomUploadFields(event.target.checked)}
          className="w-5 h-5 accent-neutral-950"
        />
        <label
          htmlFor="custom-upload-fields"
          className="text-xs font-bold text-neutral-950 uppercase tracking-widest"
        >
          Eigene Upload-Felder verwenden
        </label>
      </div>

      {!useCustomUploadFields ? (
        <div className="border border-dashed border-neutral-300 px-4 py-4 text-sm text-neutral-500 bg-white">
          Ohne eigene Upload-Felder verwendet die Store-Seite weiterhin den
          bestehenden Legacy-Fallback aus fileLimit und Standard-Uploads.
        </div>
      ) : (
        <div className="space-y-6 bg-white border border-neutral-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                Upload-Anforderungen
              </h3>
              <p className="text-sm text-neutral-500 mt-2">
                Beispiele: Front design, Back design, Logo file, Print-ready PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={addUploadField}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-950 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Feld hinzufügen
            </button>
          </div>

          <div className="space-y-6">
            {uploadFields.map((field, index) => (
              <div
                key={field.id}
                className="border border-neutral-200 bg-neutral-50 p-6 space-y-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                        Upload Field #{index + 1}
                      </p>
                      <p className="text-sm text-neutral-500">
                        Kunden-Dateien fuer diesen Service.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUploadField(field.id)}
                    className="p-3 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                      Label
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(event) =>
                        updateUploadField(field.id, "label", event.target.value)
                      }
                      placeholder="z. B. Front design"
                      className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                      Key
                    </label>
                    <input
                      type="text"
                      value={field.key}
                      onChange={(event) =>
                        updateUploadField(field.id, "key", event.target.value)
                      }
                      placeholder="front_design"
                      className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                    Helper text
                  </label>
                  <input
                    type="text"
                    value={field.helperText}
                    onChange={(event) =>
                      updateUploadField(field.id, "helperText", event.target.value)
                    }
                    placeholder="Kurzer Hinweis fuer Dateivorgaben"
                    className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
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
                      className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
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
                      className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                      Max files
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={field.maxFiles}
                      onChange={(event) =>
                        updateUploadField(field.id, "maxFiles", event.target.value)
                      }
                      className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                      Max size MB
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
                      className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-neutral-950 uppercase tracking-widest">
                      Optionen
                    </label>
                    <label className="flex items-center gap-3 min-h-[52px] px-4 border border-neutral-200 bg-white">
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
                        className="w-4 h-4 accent-neutral-950"
                      />
                      <span className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                        Pflicht
                      </span>
                    </label>
                    <label className="flex items-center gap-3 min-h-[52px] px-4 border border-neutral-200 bg-white">
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
                        className="w-4 h-4 accent-neutral-950"
                      />
                      <span className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                        Kunden-Dateilabel
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
