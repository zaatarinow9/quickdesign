"use client"

import { useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createServiceOption,
  deleteServiceOption,
  updateServiceOption,
} from "@/app/actions/options";

type AdminFieldKind =
  | "select"
  | "radio"
  | "text"
  | "number"
  | "file"
  | "color"
  | "size"
  | "textarea";

type PricingModeSelection =
  | "automatic"
  | "included"
  | "additive"
  | "override_base";

type OptionValueInput = {
  name: string;
  price: string;
  order: string;
};

type ExistingOption = {
  id: string;
  key: string | null;
  name: string;
  type: string;
  isRequired: boolean;
  order: number;
  helperText: string | null;
  pricingMode: string | null;
  configJson: string | null;
  values: {
    id: string;
    name: string;
    price: number;
    order: number;
    metadataJson: string | null;
  }[];
};

type ParsedOptionConfig = {
  adminKind?: AdminFieldKind;
  placeholder?: string;
  accept?: string;
};

type OptionEditorState = {
  optionId: string | null;
  name: string;
  fieldKey: string;
  kind: AdminFieldKind;
  isRequired: boolean;
  order: string;
  helperText: string;
  pricingMode: PricingModeSelection;
  placeholder: string;
  accept: string;
  values: OptionValueInput[];
};

interface Props {
  serviceId: string;
  options: ExistingOption[];
}

const FIELD_TYPE_OPTIONS: {
  kind: AdminFieldKind;
  label: string;
  storedAs: string;
  usesValues: boolean;
  description: string;
}[] = [
  {
    kind: "select",
    label: "Dropdown",
    storedAs: "select",
    usesValues: true,
    description: "Klassische Auswahlliste mit Werten und optionalen Aufpreisen.",
  },
  {
    kind: "radio",
    label: "Radio",
    storedAs: "radio",
    usesValues: true,
    description: "Direkte Auswahl mehrerer Werte mit optionalen Aufpreisen.",
  },
  {
    kind: "text",
    label: "Kurztext",
    storedAs: "text",
    usesValues: false,
    description: "Einzeiliges Texteingabefeld ohne Optionswerte.",
  },
  {
    kind: "number",
    label: "Zahl",
    storedAs: "number",
    usesValues: false,
    description: "Numerisches Eingabefeld ohne Optionswerte.",
  },
  {
    kind: "file",
    label: "Datei",
    storedAs: "file",
    usesValues: false,
    description: "Datei-Upload Feld ohne gespeicherte Werteliste.",
  },
  {
    kind: "color",
    label: "Farbwahl",
    storedAs: "color",
    usesValues: true,
    description: "Bleibt im Store vorerst ein Radio-Feld, speichert den gewahlten Typ aber jetzt explizit.",
  },
  {
    kind: "size",
    label: "Groesse",
    storedAs: "size",
    usesValues: true,
    description: "Kann jetzt explizit als Groessenfeld gespeichert werden, ohne auf Namens-Inferenz zu warten.",
  },
  {
    kind: "textarea",
    label: "Langer Text",
    storedAs: "textarea",
    usesValues: false,
    description: "Bleibt im Store vorerst ein Textfeld, speichert den eigentlichen Editor-Typ aber jetzt mit.",
  },
];

const DEFAULT_FIELD_TYPE_OPTION = FIELD_TYPE_OPTIONS[0]!;
const PRICING_MODE_OPTIONS: {
  value: PricingModeSelection;
  label: string;
}[] = [
  { value: "automatic", label: "Automatisch (Legacy-Fallback)" },
  { value: "included", label: "Ohne Preiswirkung" },
  { value: "additive", label: "Aufpreis addieren" },
  { value: "override_base", label: "Basispreis uberschreiben" },
];

function isAdminFieldKind(value: string): value is AdminFieldKind {
  return FIELD_TYPE_OPTIONS.some((option) => option.kind === value);
}

function normalizeOptionalString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function parseOptionConfig(configJson: string | null): ParsedOptionConfig {
  if (!configJson) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(configJson);

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    const configObject = parsedValue as Record<string, unknown>;
    const adminKind = configObject.adminKind;
    const placeholder = configObject.placeholder;
    const accept = configObject.accept;

    return {
      adminKind: typeof adminKind === "string" && isAdminFieldKind(adminKind)
        ? adminKind
        : undefined,
      placeholder: typeof placeholder === "string" ? placeholder : undefined,
      accept: typeof accept === "string" ? accept : undefined,
    };
  } catch {
    return {};
  }
}

function createEmptyValueRow(order = 1): OptionValueInput {
  return { name: "", price: "0", order: String(order) };
}

function getFieldTypeConfig(kind: AdminFieldKind) {
  return (
    FIELD_TYPE_OPTIONS.find((option) => option.kind === kind) ??
    DEFAULT_FIELD_TYPE_OPTION
  );
}

function getNextOrder(options: ExistingOption[]): string {
  const nextOrder = options.reduce((highestOrder, option) => {
    return Math.max(highestOrder, option.order);
  }, 0) + 1;

  return String(nextOrder);
}

function createEmptyEditorState(nextOrder: string): OptionEditorState {
  return {
    optionId: null,
    name: "",
    fieldKey: "",
    kind: "select",
    isRequired: true,
    order: nextOrder,
    helperText: "",
    pricingMode: "automatic",
    placeholder: "",
    accept: "",
    values: [createEmptyValueRow(1)],
  };
}

function mapStoredTypeToEditorKind(
  type: string,
  configJson: string | null,
): AdminFieldKind {
  const config = parseOptionConfig(configJson);

  if (config.adminKind) {
    return config.adminKind;
  }

  switch (type.toLowerCase()) {
    case "color":
      return "color";
    case "size":
      return "size";
    case "textarea":
      return "textarea";
    case "radio":
      return "radio";
    case "text":
      return "text";
    case "number":
      return "number";
    case "file":
      return "file";
    case "select":
    default:
      return "select";
  }
}

function normalizePricingModeSelection(
  pricingMode: string | null,
): PricingModeSelection {
  switch (pricingMode) {
    case "included":
    case "additive":
    case "override_base":
      return pricingMode;
    default:
      return "automatic";
  }
}

function createEditorStateFromOption(option: ExistingOption): OptionEditorState {
  const parsedConfig = parseOptionConfig(option.configJson);
  const sortedValues = [...option.values].sort((left, right) => {
    if (left.order === right.order) {
      return 0;
    }

    return left.order - right.order;
  });

  return {
    optionId: option.id,
    name: option.name,
    fieldKey: option.key ?? "",
    kind: mapStoredTypeToEditorKind(option.type, option.configJson),
    isRequired: option.isRequired,
    order: String(option.order),
    helperText: option.helperText ?? "",
    pricingMode: normalizePricingModeSelection(option.pricingMode),
    placeholder: parsedConfig.placeholder ?? "",
    accept: parsedConfig.accept ?? "",
    values:
      sortedValues.length > 0
        ? sortedValues.map((value, index) => ({
            name: value.name,
            price: String(value.price),
            order: String(value.order > 0 ? value.order : index + 1),
          }))
        : [createEmptyValueRow(1)],
  };
}

function parsePrice(value: string): number {
  const parsedPrice = Number.parseFloat(value);
  return Number.isFinite(parsedPrice) ? parsedPrice : 0;
}

function parseOrder(value: string, fallback: number): number {
  const parsedOrder = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedOrder)) {
    return fallback;
  }

  return Math.max(0, parsedOrder);
}

function getStoredTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case "color":
      return "color";
    case "size":
      return "size";
    case "textarea":
      return "textarea";
    case "radio":
      return "radio";
    case "text":
      return "text";
    case "number":
      return "number";
    case "file":
      return "file";
    case "select":
    default:
      return "select";
  }
}

function getNextValueOrder(values: OptionValueInput[]): number {
  return values.reduce((highestOrder, value, index) => {
    const parsedOrder = parseOrder(value.order, index + 1);
    return Math.max(highestOrder, parsedOrder);
  }, 0) + 1;
}

export default function OptionsBuilder({ serviceId, options }: Props) {
  const router = useRouter();
  const [editorState, setEditorState] = useState<OptionEditorState>(() =>
    createEmptyEditorState(getNextOrder(options)),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingOptionId, setDeletingOptionId] = useState<string | null>(null);

  const fieldTypeConfig = useMemo(
    () => getFieldTypeConfig(editorState.kind),
    [editorState.kind],
  );
  const showsPlaceholderInput =
    editorState.kind === "text" ||
    editorState.kind === "number" ||
    editorState.kind === "textarea";
  const showsAcceptInput = editorState.kind === "file";
  const supportsPricingMode = fieldTypeConfig.usesValues;
  const valueRowsHaveEmptyNames =
    fieldTypeConfig.usesValues &&
    editorState.values.some((value) => value.name.trim() === "");
  const canSave =
    editorState.name.trim() !== "" &&
    (!fieldTypeConfig.usesValues ||
      (editorState.values.length > 0 && !valueRowsHaveEmptyNames));

  const resetEditor = (nextOrder?: string) => {
    setEditorState(createEmptyEditorState(nextOrder ?? getNextOrder(options)));
    setErrorMessage("");
  };

  const handleTypeChange = (nextKind: AdminFieldKind) => {
    const nextTypeConfig = getFieldTypeConfig(nextKind);

    setEditorState((current) => ({
      ...current,
      kind: nextKind,
      pricingMode: nextTypeConfig.usesValues ? current.pricingMode : "included",
      placeholder:
        nextKind === "text" || nextKind === "number" || nextKind === "textarea"
          ? current.placeholder
          : "",
      accept: nextKind === "file" ? current.accept : "",
      values:
        nextTypeConfig.usesValues && current.values.length === 0
          ? [createEmptyValueRow(1)]
          : nextTypeConfig.usesValues
            ? current.values
            : [createEmptyValueRow(1)],
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const updateValueRow = (
    index: number,
    field: keyof OptionValueInput,
    value: string,
  ) => {
    setEditorState((current) => ({
      ...current,
      values: current.values.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        if (field === "name") {
          return { ...row, name: value };
        }

        if (field === "price") {
          return { ...row, price: value };
        }

        return { ...row, order: value };
      }),
    }));
    setErrorMessage("");
  };

  const addValueRow = () => {
    setEditorState((current) => ({
      ...current,
      values: [...current.values, createEmptyValueRow(getNextValueOrder(current.values))],
    }));
  };

  const removeValueRow = (index: number) => {
    setEditorState((current) => ({
      ...current,
      values:
        current.values.length === 1
          ? [createEmptyValueRow(1)]
          : current.values.filter((_, rowIndex) => rowIndex !== index),
    }));
    setErrorMessage("");
  };

  const startEditing = (option: ExistingOption) => {
    setEditorState(createEditorStateFromOption(option));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const cancelEditing = () => {
    resetEditor();
    setSuccessMessage("");
  };

  const handleSave = async () => {
    if (!editorState.name.trim()) {
      setErrorMessage("Bitte geben Sie einen Feldnamen ein.");
      return;
    }

    if (fieldTypeConfig.usesValues && valueRowsHaveEmptyNames) {
      setErrorMessage("Bitte fullen Sie alle sichtbaren Werte aus oder entfernen Sie leere Zeilen.");
      return;
    }

    const fallbackOrder = Number.parseInt(getNextOrder(options), 10);
    const payload = {
      name: editorState.name,
      key: editorState.fieldKey,
      type: editorState.kind,
      isRequired: editorState.isRequired,
      order: parseOrder(editorState.order, fallbackOrder),
      helperText: editorState.helperText,
      pricingMode: supportsPricingMode ? editorState.pricingMode : "included",
      config: {
        placeholder: showsPlaceholderInput ? editorState.placeholder : "",
        accept: showsAcceptInput ? editorState.accept : "",
      },
      values: fieldTypeConfig.usesValues
        ? editorState.values.map((value, index) => ({
            name: value.name,
            price: parsePrice(value.price),
            order: parseOrder(value.order, index + 1),
          }))
        : [],
    };

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = editorState.optionId
      ? await updateServiceOption(serviceId, editorState.optionId, payload)
      : await createServiceOption(serviceId, payload);

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    setSuccessMessage(
      editorState.optionId
        ? "Feld erfolgreich aktualisiert."
        : "Feld erfolgreich gespeichert.",
    );

    resetEditor(
      editorState.optionId
        ? getNextOrder(options)
        : String(parseOrder(editorState.order, fallbackOrder) + 1),
    );
    router.refresh();
  };

  const handleDelete = async (optionId: string) => {
    const shouldDelete = window.confirm(
      "Mochten Sie dieses Feld wirklich loschen?",
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingOptionId(optionId);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await deleteServiceOption(optionId, serviceId);
    setDeletingOptionId(null);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    if (editorState.optionId === optionId) {
      resetEditor();
    }

    setSuccessMessage("Feld erfolgreich geloscht.");
    router.refresh();
  };

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-950 uppercase tracking-tighter mb-2">
              Felder und Widgets
            </h2>
            <p className="text-sm text-neutral-500">
              Verwalten Sie die gespeicherte Service-Konfiguration jetzt mit
              echten DB-Feldern statt nur mit Legacy-Inferenz.
            </p>
          </div>
        </div>

        {options.length === 0 ? (
          <div className="p-10 border border-dashed border-neutral-300 text-center text-sm font-bold uppercase tracking-widest text-neutral-500 bg-white">
            Noch keine Felder hinzugefugt.
          </div>
        ) : (
          <div className="space-y-4">
            {options.map((option) => (
              <div
                key={option.id}
                className="bg-white border border-neutral-200 p-6 flex flex-col gap-5 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-neutral-950">
                        {option.name}
                      </h3>
                      <span className="px-2 py-1 bg-neutral-100 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        {getStoredTypeLabel(option.type)}
                      </span>
                      <span className="px-2 py-1 bg-neutral-100 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        Reihenfolge {option.order}
                      </span>
                      {option.pricingMode && (
                        <span className="px-2 py-1 bg-neutral-100 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          {option.pricingMode}
                        </span>
                      )}
                      {option.isRequired && (
                        <span className="px-2 py-1 bg-neutral-950 text-[10px] font-bold uppercase tracking-widest text-white">
                          Pflichtfeld
                        </span>
                      )}
                    </div>

                    {option.key && (
                      <p className="text-xs font-mono text-neutral-500">
                        key: {option.key}
                      </p>
                    )}

                    {option.helperText && (
                      <p className="text-sm text-neutral-500">{option.helperText}</p>
                    )}

                    {option.values.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {option.values
                          .slice()
                          .sort((left, right) => left.order - right.order)
                          .map((value, index) => (
                            <span
                              key={value.id}
                              className="px-3 py-1.5 border border-neutral-200 text-xs font-bold text-neutral-600 bg-neutral-50"
                            >
                              #{value.order > 0 ? value.order : index + 1} {value.name}
                              {value.price !== 0 ? ` (+${value.price.toFixed(2)} EUR)` : ""}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">
                        Dieses Feld verwendet keine gespeicherten Optionswerte.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEditing(option)}
                      className="flex items-center gap-2 px-4 py-3 border border-neutral-200 text-xs font-bold uppercase tracking-widest text-neutral-700 hover:border-neutral-950 hover:text-neutral-950 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(option.id)}
                      disabled={deletingOptionId === option.id}
                      className="flex items-center gap-2 px-4 py-3 border border-red-100 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash className="w-4 h-4" />
                      {deletingOptionId === option.id ? "Wird geloscht..." : "Loschen"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-neutral-50 border border-neutral-200 p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h3 className="text-sm font-bold text-neutral-950 uppercase tracking-widest mb-2">
              {editorState.optionId ? "Feld bearbeiten" : "Neues Feld hinzufugen"}
            </h3>
            <p className="text-sm text-neutral-500 max-w-2xl">
              Speichert jetzt echte Feld-Konfiguration fur Reihenfolge,
              Hilfetext, Pricing-Mode, Key und einfache UI-Config.
            </p>
          </div>

          {editorState.optionId && (
            <button
              type="button"
              onClick={cancelEditing}
              className="flex items-center gap-2 px-4 py-3 border border-neutral-200 text-xs font-bold uppercase tracking-widest text-neutral-700 hover:border-neutral-950 hover:text-neutral-950 transition-colors"
            >
              <X className="w-4 h-4" />
              Bearbeitung abbrechen
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
              Feldname
            </label>
            <input
              type="text"
              value={editorState.name}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="z. B. Format, Farbe, Menge"
              className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
              Stabiles Feld-Key
            </label>
            <input
              type="text"
              value={editorState.fieldKey}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  fieldKey: event.target.value,
                }))
              }
              placeholder="wird automatisch erzeugt"
              className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
              Feldtyp
            </label>
            <select
              value={editorState.kind}
              onChange={(event) => handleTypeChange(event.target.value as AdminFieldKind)}
              className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <option key={option.kind} value={option.kind}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-3">
              {fieldTypeConfig.description} Gespeichert als{" "}
              <span className="font-bold">{fieldTypeConfig.storedAs}</span>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
              Reihenfolge
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={editorState.order}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  order: event.target.value,
                }))
              }
              className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
              Pricing-Modus
            </label>
            <select
              value={supportsPricingMode ? editorState.pricingMode : "included"}
              disabled={!supportsPricingMode}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  pricingMode: event.target.value as PricingModeSelection,
                }))
              }
              className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white disabled:bg-neutral-100 disabled:text-neutral-500"
            >
              {PRICING_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
              Hilfetext
            </label>
            <input
              type="text"
              value={editorState.helperText}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  helperText: event.target.value,
                }))
              }
              placeholder="Kurzer Hinweis fur das Feld"
              className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
            />
          </div>

          {showsPlaceholderInput ? (
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Platzhalter
              </label>
              <input
                type="text"
                value={editorState.placeholder}
                onChange={(event) =>
                  setEditorState((current) => ({
                    ...current,
                    placeholder: event.target.value,
                  }))
                }
                placeholder="Optionaler Platzhaltertext"
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
              />
            </div>
          ) : showsAcceptInput ? (
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Erlaubte Dateitypen
              </label>
              <input
                type="text"
                value={editorState.accept}
                onChange={(event) =>
                  setEditorState((current) => ({
                    ...current,
                    accept: event.target.value,
                  }))
                }
                placeholder="z. B. image/*,.pdf"
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
              />
            </div>
          ) : (
            <div className="border border-dashed border-neutral-300 px-4 py-4 text-sm text-neutral-500 bg-white">
              Fur diesen Feldtyp ist in Phase 3A keine weitere einfache
              UI-Konfiguration notwendig.
            </div>
          )}
        </div>

        <div className="mb-8 flex items-center gap-4 min-h-[54px] px-4 border border-neutral-300 bg-white">
          <input
            type="checkbox"
            checked={editorState.isRequired}
            onChange={(event) =>
              setEditorState((current) => ({
                ...current,
                isRequired: event.target.checked,
              }))
            }
            id="builder-required"
            className="w-5 h-5 accent-neutral-950"
          />
          <label
            htmlFor="builder-required"
            className="text-xs font-bold text-neutral-950 uppercase tracking-widest"
          >
            Pflichtfeld
          </label>
        </div>

        {fieldTypeConfig.usesValues && (
          <div className="mb-8 p-6 bg-white border border-neutral-200">
            <div className="flex justify-between items-center gap-4 mb-6">
              <div>
                <h4 className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                  Werte und Aufpreise
                </h4>
                <p className="text-sm text-neutral-500 mt-2">
                  Jeder Wert braucht einen Namen. Reihenfolge wird jetzt explizit
                  gespeichert.
                </p>
              </div>
              <button
                type="button"
                onClick={addValueRow}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-950 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Wert hinzufugen
              </button>
            </div>

            <div className="space-y-4">
              {editorState.values.map((value, index) => (
                <div
                  key={`${index}-${editorState.optionId ?? "new"}`}
                  className="grid grid-cols-1 md:grid-cols-[100px_minmax(0,1fr)_140px_52px] gap-4 items-center"
                >
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={value.order}
                    onChange={(event) =>
                      updateValueRow(index, "order", event.target.value)
                    }
                    placeholder="Sort"
                    className="border border-neutral-300 p-3 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                  />
                  <input
                    type="text"
                    value={value.name}
                    onChange={(event) =>
                      updateValueRow(index, "name", event.target.value)
                    }
                    placeholder="Wertname"
                    className="border border-neutral-300 p-3 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={value.price}
                      onChange={(event) =>
                        updateValueRow(index, "price", event.target.value)
                      }
                      placeholder="0.00"
                      className="w-full border border-neutral-300 p-3 pr-12 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-xs">
                      EUR
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeValueRow(index)}
                    className="p-3 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSubmitting}
            className="flex items-center justify-center gap-2 bg-neutral-950 text-white px-8 py-4 font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting
              ? "Wird gespeichert..."
              : editorState.optionId
                ? "Feld aktualisieren"
                : "Feld speichern"}
          </button>

          {!canSave && (
            <p className="text-sm text-neutral-500">
              Feldname und sichtbare Werte mussen vollstandig ausgefullt sein.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
