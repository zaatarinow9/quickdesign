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
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import {
  getServicePricingModeMeta,
  getServiceVisibilityMeta,
} from "@/lib/admin/service-display";
import { MAX_SERVER_ACTION_UPLOAD_MB } from "@/lib/storage/upload-limits";
import ServicePricingEditor, {
  type ServicePricingPreview,
} from "@/components/admin/ServicePricingEditor";
import ServiceUploadFieldsEditor, {
  type ServiceUploadPreview,
} from "@/components/admin/ServiceUploadFieldsEditor";

type EditorTab = "basic" | "pricing" | "options" | "uploads" | "preview";

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

type FlowPreviewItem = {
  step: string;
  title: string;
  detail: string;
};

const TAB_ITEMS: Array<{
  id: EditorTab;
  label: string;
  description: string;
}> = [
  {
    id: "basic",
    label: "Grundeinstellungen",
    description: "Name, Slug, Beschreibung und Sichtbarkeit.",
  },
  {
    id: "pricing",
    label: "Preisgestaltung",
    description: "Grundpreis, Regeln und Preislogik.",
  },
  {
    id: "options",
    label: "Kundenoptionen",
    description: "Pflegbare Auswahl- und Eingabefelder.",
  },
  {
    id: "uploads",
    label: "Datei-Uploads",
    description: "Pflichtdateien, Limits und Dateitypen.",
  },
  {
    id: "preview",
    label: "Vorschau",
    description: "Zusammenfassung vor dem Speichern.",
  },
] as const;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createInitialUploadPreview(
  service: ServiceEditorSeed | undefined,
): ServiceUploadPreview {
  if (service?.configJson) {
    try {
      const parsedValue: unknown = JSON.parse(service.configJson);

      if (isRecord(parsedValue) && Array.isArray(parsedValue.uploadFields)) {
        const uploadFieldCount = parsedValue.uploadFields.filter((field) =>
          isRecord(field),
        ).length;

        return {
          enabled: uploadFieldCount > 0,
          fieldCount: uploadFieldCount,
          summaryLines:
            uploadFieldCount > 0
              ? [
                  `${uploadFieldCount} Uploadfeld${
                    uploadFieldCount === 1 ? "" : "er"
                  } im Schritt Dateien`,
                  `Aktuelles Upload-Limit im Checkout: ${MAX_SERVER_ACTION_UPLOAD_MB} MB`,
                ]
              : [
                  "Explizite Upload-Felder sind aktiv, aktuell aber leer.",
                  `Aktuelles Upload-Limit im Checkout: ${MAX_SERVER_ACTION_UPLOAD_MB} MB`,
                ],
        };
      }
    } catch {
      return {
        enabled: false,
        fieldCount: 0,
        summaryLines: [
          "Vorhandene Upload-Konfiguration konnte nicht gelesen werden.",
          `Aktuelles Upload-Limit im Checkout: ${MAX_SERVER_ACTION_UPLOAD_MB} MB`,
        ],
      };
    }
  }

  if ((service?.fileLimit ?? 0) > 0) {
    return {
      enabled: true,
      fieldCount: service?.fileLimit ?? 0,
      summaryLines: [
        `Legacy-Fallback mit ${service?.fileLimit ?? 0} Datei-Slot${
          service?.fileLimit === 1 ? "" : "s"
        }`,
        `Aktuelles Upload-Limit im Checkout: ${MAX_SERVER_ACTION_UPLOAD_MB} MB`,
      ],
    };
  }

  return {
    enabled: false,
    fieldCount: 0,
    summaryLines: [
      `Aktuelles Upload-Limit im Checkout: ${MAX_SERVER_ACTION_UPLOAD_MB} MB`,
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

function buildFlowPreviewItems(
  optionCount: number,
  pricingPreview: ServicePricingPreview,
  uploadPreview: ServiceUploadPreview,
): FlowPreviewItem[] {
  return [
    {
      step: "1",
      title: "Konfiguration",
      detail:
        optionCount > 0
          ? `${optionCount} Feld${optionCount === 1 ? "" : "er"} plus ${pricingPreview.modeLabel.toLowerCase()}`
          : `Nur Preislogik (${pricingPreview.modeLabel.toLowerCase()})`,
    },
    {
      step: "2",
      title: "Dateien",
      detail: uploadPreview.enabled
        ? `${uploadPreview.fieldCount} Uploadfeld${
            uploadPreview.fieldCount === 1 ? "" : "er"
          }`
        : "Wird automatisch übersprungen",
    },
    {
      step: "3",
      title: "Übersicht",
      detail: "Auswahl, Dateien, Hinweise und Preis",
    },
    {
      step: "4",
      title: "Bestellung",
      detail: "Warenkorb und Checkout",
    },
  ];
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
  const [designerType, setDesignerType] = useState(
    service?.designerType ?? "none",
  );
  const [fileLimit, setFileLimit] = useState(
    service ? String(service.fileLimit) : "0",
  );
  const [hasDesigner, setHasDesigner] = useState(service?.hasDesigner ?? false);
  const [hasColorPicker, setHasColorPicker] = useState(
    service?.hasColorPicker ?? false,
  );
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [pricingPreview, setPricingPreview] = useState<ServicePricingPreview>(
    () => createInitialPricingPreview(service),
  );
  const [uploadPreview, setUploadPreview] = useState<ServiceUploadPreview>(
    () => createInitialUploadPreview(service),
  );

  const visibilityMeta = getServiceVisibilityMeta(isActive);
  const previewSentence = useMemo(
    () => buildPreviewSentence(pricingPreview, uploadPreview),
    [pricingPreview, uploadPreview],
  );
  const flowPreviewItems = useMemo(
    () => buildFlowPreviewItems(optionCount, pricingPreview, uploadPreview),
    [optionCount, pricingPreview, uploadPreview],
  );

  return (
    <form action={action} className="space-y-8">
      <input
        type="hidden"
        name="existingConfigJson"
        value={service?.configJson ?? ""}
      />

      <AdminCard className="p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-sky-600 dark:text-sky-300">
              Service Verwaltung
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-4xl">
              {mode === "create" ? "Neue Leistung anlegen" : "Leistung bearbeiten"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Alle vorhandenen Felder bleiben erhalten, werden aber in besser
              verstaendliche Abschnitte gruppiert.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminBadge
              tone={isActive ? "emerald" : "slate"}
              className={visibilityMeta.badgeClassName}
            >
              {visibilityMeta.label}
            </AdminBadge>
            {optionsHref ? (
              <Link
                href={optionsHref}
                className={getAdminButtonClassName("secondary")}
              >
                <Layers3 className="h-4 w-4" />
                Kundenoptionen ({optionCount})
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Layers3 className="h-4 w-4" />
                Optionen nach dem Speichern
              </span>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-3xl border px-5 py-4 text-left transition-all ${
                  activeTab === tab.id
                    ? "border-slate-900 bg-slate-950 text-white shadow-lg dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600"
                }`}
              >
                <p className="text-sm font-semibold">
                  {tab.label}
                </p>
                <p
                  className={`mt-2 text-sm leading-5 ${
                    activeTab === tab.id
                      ? "text-slate-200 dark:text-slate-700"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {tab.description}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/80">
            <p className="text-xs font-medium tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Kurzuebersicht
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">
              {name.trim() || "Unbenannte Leistung"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {previewSentence}
            </p>
            <div className="mt-5 space-y-3">
              {flowPreviewItems.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Schritt {item.step}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminCard>

      {activeTab === "basic" && (
        <AdminCard className="p-6 md:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                    Grundeinstellungen
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                    Diese Angaben steuern Name, URL, Bild und Beschreibung auf
                    der Service-Seite.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Service-Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Slug
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={slug}
                      onChange={(event) => setSlug(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Bild-URL
                    </label>
                    <input
                      type="url"
                      name="image"
                      value={image}
                      onChange={(event) => setImage(event.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Kurzbeschreibung
                  </label>
                  <textarea
                    name="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                    Sichtbarkeit und interne Hinweise
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                    Legacy-Felder bleiben erhalten und sind hier bewusst separat
                    gruppiert.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Design-Modus
                    </label>
                    <select
                      name="designerType"
                      value={designerType}
                      onChange={(event) => setDesignerType(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                    >
                      <option value="none">Standard (nur Bild)</option>
                      <option value="tshirt">T-Shirt Designer</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Legacy Datei-Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="fileLimit"
                      value={fileLimit}
                      onChange={(event) => setFileLimit(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="flex min-h-[64px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950">
                    <input
                      type="checkbox"
                      name="hasDesigner"
                      checked={hasDesigner}
                      onChange={(event) => setHasDesigner(event.target.checked)}
                      className="h-5 w-5 accent-slate-950"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Designer aktiv
                    </span>
                  </label>
                  <label className="flex min-h-[64px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950">
                    <input
                      type="checkbox"
                      name="hasColorPicker"
                      checked={hasColorPicker}
                      onChange={(event) => setHasColorPicker(event.target.checked)}
                      className="h-5 w-5 accent-slate-950"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Farbwahl aktiv
                    </span>
                  </label>
                  <label className="flex min-h-[64px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                      className="h-5 w-5 accent-slate-950"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Sichtbarkeit im Shop
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Was sieht der Kunde?
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {name.trim() || "Service-Name fehlt"}
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  URL
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  /services/{slug.trim() || "service-slug"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Beschreibung
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {description.trim() || "Noch keine Beschreibung eingetragen."}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <ImageIcon className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                    Bild
                  </p>
                </div>
                <p className="mt-2 break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {image.trim() || "Verwendet Default-Bild"}
                </p>
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      {activeTab === "pricing" && (
        <AdminCard className="p-6 md:p-8">
          <ServicePricingEditor
            initialPricingMode={service?.pricingMode}
            initialConfigJson={service?.configJson}
            onPreviewChange={setPricingPreview}
          />
        </AdminCard>
      )}

      {activeTab === "options" && (
        <AdminCard className="p-6 md:p-8">
          {optionsHref ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                    Kundenoptionen
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                    Select-, Radio-, Text- und Zahlenfelder werden weiterhin
                    kompatibel im bestehenden Options-Builder gepflegt.
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Sichtbar im Kundenfluss
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                    Alle Kundenoptionen erscheinen im Schritt
                    {" "}
                    <span className="font-semibold">Konfiguration</span>.
                    Datei-Anforderungen bleiben im separaten Schritt
                    {" "}
                    <span className="font-semibold">Dateien</span>.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Aktive Felder
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                      {optionCount}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Status
                    </p>
                    <p className="mt-3 text-sm font-medium leading-7 text-slate-700 dark:text-slate-200">
                      Bestehende Services bleiben vollstaendig kompatibel.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Naechster Schritt
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Oeffnen Sie den bestehenden Options-Builder, um Pflichtfelder,
                  Auswahlwerte und Preisaufschlaege zu pflegen.
                </p>
                <Link
                  href={optionsHref}
                  className={`${getAdminButtonClassName("primary")} mt-5`}
                >
                  <Layers3 className="h-4 w-4" />
                  Kundenoptionen oeffnen
                </Link>
              </div>
            </div>
          ) : (
            <AdminEmptyState
              icon={Layers3}
              title="Kundenoptionen sind nach dem ersten Speichern verfuegbar."
              description="Speichern Sie die neue Leistung zuerst. Danach koennen Sie Auswahlfelder, Pflichtangaben und Preisaufschlaege sauber verwalten."
            />
          )}
        </AdminCard>
      )}

      {activeTab === "uploads" && (
        <AdminCard className="p-6 md:p-8">
          <ServiceUploadFieldsEditor
            initialConfigJson={service?.configJson}
            onPreviewChange={setUploadPreview}
          />
        </AdminCard>
      )}

      {activeTab === "preview" && (
        <AdminCard className="p-6 md:p-8">
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/80 xl:col-span-2">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Service-Vorschau
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">
                    {name.trim() || "Unbenannte Leistung"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {description.trim() || "Noch keine Beschreibung eingetragen."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-2 text-[11px] font-semibold ${visibilityMeta.badgeClassName}`}
                >
                  {visibilityMeta.label}
                </span>
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/50 dark:text-sky-200">
                  {pricingPreview.modeLabel}
                </span>
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/50 dark:text-amber-200">
                  {uploadPreview.enabled
                    ? `${uploadPreview.fieldCount} Uploadfeld${
                        uploadPreview.fieldCount === 1 ? "" : "er"
                      }`
                    : "Keine Uploads"}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Interne Steuerung
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {basePrice || "0.00"} EUR Startpreis
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Designer: {hasDesigner ? "aktiv" : "aus"} | Farbwahl:{" "}
                {hasColorPicker ? "aktiv" : "aus"} | Legacy Datei-Limit:{" "}
                {fileLimit || "0"}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Layers3 className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Kundenoptionen
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {optionCount} Feld{optionCount === 1 ? "" : "er"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {optionsHref
                  ? "Select-, Radio-, Text- und Zahlenfelder werden weiterhin separat gepflegt."
                  : "Nach dem ersten Speichern koennen Sie die Kundenoptionen direkt ergaenzen."}
              </p>
              {optionsHref && (
                <Link
                  href={optionsHref}
                  className={`${getAdminButtonClassName("secondary")} mt-4`}
                >
                  <Layers3 className="h-4 w-4" />
                  Kundenoptionen
                </Link>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Preis-Zusammenfassung
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {pricingPreview.modeLabel}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {pricingPreview.summaryLines.map((line) => (
                  <span
                    key={line}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {line}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 xl:col-span-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Kundenfluss-Vorschau
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {flowPreviewItems.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Schritt {item.step}
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-950 dark:text-slate-50">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Upload-Zusammenfassung
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    Aktuelles Upload-Limit im Checkout: {MAX_SERVER_ACTION_UPLOAD_MB} MB
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {uploadPreview.summaryLines.map((line) => (
                  <span
                    key={line}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {line}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      <AdminCard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-7 text-slate-500 dark:text-slate-300">
            Vor dem Speichern: Kurz pruefen, ob Sichtbarkeit, Preislogik und
            Upload-Hinweise zusammenpassen.
          </p>
          <button type="submit" className={getAdminButtonClassName("primary")}>
            {mode === "create" ? "Leistung speichern" : "Aenderungen speichern"}
          </button>
        </div>
      </AdminCard>
    </form>
  );
}
