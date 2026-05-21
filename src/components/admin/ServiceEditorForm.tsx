"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Eye,
  FileText,
  ImageIcon,
  Layers3,
  Settings2,
  Upload,
} from "lucide-react";
import {
  getServiceVisibilityMeta,
  getServicePricingModeMeta,
} from "@/lib/admin/service-display";
import { MAX_SERVER_ACTION_UPLOAD_MB } from "@/lib/storage/upload-limits";
import ServicePricingEditor, {
  type ServicePricingPreview,
} from "@/components/admin/ServicePricingEditor";
import ServiceUploadFieldsEditor, {
  type ServiceUploadPreview,
} from "@/components/admin/ServiceUploadFieldsEditor";

type EditorTab = "basic" | "pricing" | "uploads" | "preview";

type ServiceEditorSeed = {
  name: string;
  slug: string;
  description: string;
  image: string;
  basePrice: number;
  designerType: string;
  fileLimit: number;
  hasDesigner: boolean;
  hasColorPicker: boolean;
  isActive: boolean;
  pricingMode?: string | null;
  configJson?: string | null;
};

type ServiceEditorFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  service?: ServiceEditorSeed;
  optionCount?: number;
  optionsHref?: string | null;
};

const TAB_ITEMS: Array<{
  id: EditorTab;
  label: string;
  description: string;
}> = [
  {
    id: "basic",
    label: "Basis",
    description: "Was sieht der Kunde und was bleibt intern?",
  },
  {
    id: "pricing",
    label: "Preislogik",
    description: "Wie wird der Preis berechnet?",
  },
  {
    id: "uploads",
    label: "Uploads",
    description: "Welche Dateien muss der Kunde hochladen?",
  },
  {
    id: "preview",
    label: "Vorschau",
    description: "Kurze Kontrollansicht vor dem Speichern.",
  },
];

function createInitialPricingPreview(
  service: ServiceEditorSeed | undefined,
): ServicePricingPreview {
  const pricingMeta = getServicePricingModeMeta(service?.pricingMode);

  return {
    mode: "fixed",
    modeLabel: pricingMeta.label,
    summaryLines: [pricingMeta.description],
  };
}

function createInitialUploadPreview(): ServiceUploadPreview {
  return {
    enabled: false,
    fieldCount: 0,
    summaryLines: [
      `Checkout-Limit aktuell: ${MAX_SERVER_ACTION_UPLOAD_MB} MB pro Datei.`,
    ],
  };
}

function buildPreviewSentence(
  pricingPreview: ServicePricingPreview,
  uploadPreview: ServiceUploadPreview,
): string {
  if (uploadPreview.enabled && uploadPreview.fieldCount > 0) {
    return `Dieser Service nutzt ${pricingPreview.modeLabel.toLowerCase()} und erwartet ${uploadPreview.fieldCount} Uploadfeld${
      uploadPreview.fieldCount === 1 ? "" : "er"
    }.`;
  }

  return `Dieser Service nutzt ${pricingPreview.modeLabel.toLowerCase()} und benoetigt keine zusaetzlichen Kundendateien.`;
}

export default function ServiceEditorForm({
  mode,
  action,
  service,
  optionCount = 0,
  optionsHref = null,
}: ServiceEditorFormProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("basic");
  const [name, setName] = useState(service?.name ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [image, setImage] = useState(service?.image ?? "");
  const [basePrice, setBasePrice] = useState(
    service ? String(service.basePrice) : "",
  );
  const [designerType, setDesignerType] = useState(service?.designerType ?? "none");
  const [fileLimit, setFileLimit] = useState(service ? String(service.fileLimit) : "0");
  const [hasDesigner, setHasDesigner] = useState(service?.hasDesigner ?? false);
  const [hasColorPicker, setHasColorPicker] = useState(
    service?.hasColorPicker ?? false,
  );
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [pricingPreview, setPricingPreview] = useState<ServicePricingPreview>(
    () => createInitialPricingPreview(service),
  );
  const [uploadPreview, setUploadPreview] = useState<ServiceUploadPreview>(
    createInitialUploadPreview,
  );

  const visibilityMeta = getServiceVisibilityMeta(isActive);
  const previewSentence = useMemo(
    () => buildPreviewSentence(pricingPreview, uploadPreview),
    [pricingPreview, uploadPreview],
  );

  return (
    <form action={action} className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Service Verwaltung
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              {mode === "create" ? "Neue Leistung anlegen" : "Leistung bearbeiten"}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Alle vorhandenen Felder bleiben erhalten, werden aber in besser
              verstaendliche Abschnitte gruppiert.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] ${visibilityMeta.badgeClassName}`}
            >
              {visibilityMeta.label}
            </span>
            {optionsHref ? (
              <Link
                href={optionsHref}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
              >
                <Layers3 className="h-4 w-4" />
                Kundenoptionen ({optionCount})
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                <Layers3 className="h-4 w-4" />
                Optionen nach dem Speichern
              </span>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-3xl border px-5 py-4 text-left transition-all ${
                  activeTab === tab.id
                    ? "border-slate-900 bg-slate-950 text-white shadow-lg"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.22em]">
                  {tab.label}
                </p>
                <p
                  className={`mt-2 text-sm leading-5 ${
                    activeTab === tab.id ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  {tab.description}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Kurzuebersicht
            </p>
            <p className="mt-3 text-lg font-bold text-slate-950">
              {name.trim() || "Unbenannte Leistung"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {previewSentence}
            </p>
          </div>
        </div>
      </div>

      {activeTab === "basic" && (
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-950">
                    Was sieht der Kunde?
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Diese Angaben steuern Name, URL, Bild und Beschreibung auf
                    der Service-Seite.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Service-Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Slug
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={slug}
                      onChange={(event) => setSlug(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Bild-URL
                    </label>
                    <input
                      type="url"
                      name="image"
                      value={image}
                      onChange={(event) => setImage(event.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Grundpreis (EUR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="basePrice"
                      value={basePrice}
                      onChange={(event) => setBasePrice(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                    Kurzbeschreibung
                  </label>
                  <textarea
                    name="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-950">
                    Interne Einstellungen
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Legacy-Felder bleiben erhalten und sind hier bewusst separat
                    gruppiert.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Design-Modus
                    </label>
                    <select
                      name="designerType"
                      value={designerType}
                      onChange={(event) => setDesignerType(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
                    >
                      <option value="none">Standard (nur Bild)</option>
                      <option value="tshirt">T-Shirt Designer</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Legacy Datei-Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="fileLimit"
                      value={fileLimit}
                      onChange={(event) => setFileLimit(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="flex min-h-[64px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <input
                      type="checkbox"
                      name="hasDesigner"
                      checked={hasDesigner}
                      onChange={(event) => setHasDesigner(event.target.checked)}
                      className="h-5 w-5 accent-slate-950"
                    />
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Designer aktiv
                    </span>
                  </label>
                  <label className="flex min-h-[64px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <input
                      type="checkbox"
                      name="hasColorPicker"
                      checked={hasColorPicker}
                      onChange={(event) => setHasColorPicker(event.target.checked)}
                      className="h-5 w-5 accent-slate-950"
                    />
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Farbwahl aktiv
                    </span>
                  </label>
                  <label className="flex min-h-[64px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                      className="h-5 w-5 accent-slate-950"
                    />
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                      Sichtbar im Shop
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Was sieht der Kunde?
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {name.trim() || "Service-Name fehlt"}
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  URL
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  /services/{slug.trim() || "service-slug"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Beschreibung
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {description.trim() || "Noch keine Beschreibung eingetragen."}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <ImageIcon className="h-4 w-4" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em]">
                    Bild
                  </p>
                </div>
                <p className="mt-2 break-all text-sm text-slate-700">
                  {image.trim() || "Verwendet Default-Bild"}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "pricing" && (
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <ServicePricingEditor
            initialPricingMode={service?.pricingMode}
            initialConfigJson={service?.configJson}
            onPreviewChange={setPricingPreview}
          />
        </section>
      )}

      {activeTab === "uploads" && (
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <ServiceUploadFieldsEditor
            initialConfigJson={service?.configJson}
            onPreviewChange={setUploadPreview}
          />
        </section>
      )}

      {activeTab === "preview" && (
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:col-span-2">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Service-Vorschau
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950">
                    {name.trim() || "Unbenannte Leistung"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {description.trim() || "Noch keine Beschreibung eingetragen."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] ${visibilityMeta.badgeClassName}`}
                >
                  {visibilityMeta.label}
                </span>
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
                  {pricingPreview.modeLabel}
                </span>
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
                  {uploadPreview.enabled
                    ? `${uploadPreview.fieldCount} Uploadfeld${
                        uploadPreview.fieldCount === 1 ? "" : "er"
                      }`
                    : "Keine Uploads"}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Interne Steuerung
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {basePrice || "0.00"} EUR Startpreis
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Designer: {hasDesigner ? "aktiv" : "aus"} | Farbwahl:{" "}
                {hasColorPicker ? "aktiv" : "aus"} | Legacy Datei-Limit:{" "}
                {fileLimit || "0"}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <Layers3 className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Kundenoptionen
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {optionCount} Feld{optionCount === 1 ? "" : "er"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {optionsHref
                  ? "Select-, Radio-, Text- und Zahlenfelder werden weiterhin separat gepflegt."
                  : "Nach dem ersten Speichern koennen Sie die Kundenoptionen direkt ergaenzen."}
              </p>
              {optionsHref && (
                <Link
                  href={optionsHref}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
                >
                  <Layers3 className="h-4 w-4" />
                  Optionen oeffnen
                </Link>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Preis-Zusammenfassung
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {pricingPreview.modeLabel}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {pricingPreview.summaryLines.map((line) => (
                  <span
                    key={line}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {line}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Upload-Zusammenfassung
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    Effektiv {MAX_SERVER_ACTION_UPLOAD_MB} MB pro Datei
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {uploadPreview.summaryLines.map((line) => (
                  <span
                    key={line}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {line}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-500">
          Vor dem Speichern: Kurz pruefen, ob Sichtbarkeit, Preislogik und
          Upload-Hinweise zusammenpassen.
        </p>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-slate-800"
        >
          {mode === "create" ? "Leistung speichern" : "Aenderungen speichern"}
        </button>
      </div>
    </form>
  );
}
