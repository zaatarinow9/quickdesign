import Link from "next/link";
import { Copy, Eye, EyeOff, Layers3, Plus, Search, Settings2, Upload } from "lucide-react";
import {
  buildServiceManagementSummary,
  getServicePricingModeMeta,
  getServiceUploadSummary,
  getServiceVisibilityMeta,
  normalizeServicePricingModeValue,
} from "@/lib/admin/service-display";
import { requireAdminPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { normalizeServiceConfiguration } from "@/lib/services/configuration/normalize";
import { duplicateService, toggleServiceVisibility } from "@/app/actions/service";

type ServicesSearchParams = {
  search?: string;
  status?: string;
  type?: string;
};

type StatusFilter = "all" | "active" | "hidden";
type TypeFilter =
  | "all"
  | "fixed"
  | "quantity_tiers"
  | "area"
  | "option_based"
  | "custom_quote";

function normalizeStatusFilter(value: string | undefined): StatusFilter {
  switch (value) {
    case "active":
    case "hidden":
      return value;
    default:
      return "all";
  }
}

function normalizeTypeFilter(value: string | undefined): TypeFilter {
  switch (value) {
    case "fixed":
    case "quantity_tiers":
    case "area":
    case "option_based":
    case "custom_quote":
      return value;
    default:
      return "all";
  }
}

export default async function AdminServices({
  searchParams,
}: {
  searchParams?: Promise<ServicesSearchParams>;
}) {
  await requireAdminPermission("canManageServices");
  const params = searchParams ? await searchParams : {};
  const search = params.search?.trim() ?? "";
  const statusFilter = normalizeStatusFilter(params.status);
  const typeFilter = normalizeTypeFilter(params.type);

  const services = await prisma.service.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { slug: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
      ...(statusFilter === "active"
        ? { isActive: true }
        : statusFilter === "hidden"
          ? { isActive: false }
          : {}),
    },
    include: {
      options: {
        include: {
          values: true,
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  const servicesWithSummary = services
    .map((service) => {
      const config = normalizeServiceConfiguration(service);
      const pricingMode = normalizeServicePricingModeValue(config.pricing.mode);
      const pricingMeta = getServicePricingModeMeta(pricingMode);
      const visibilityMeta = getServiceVisibilityMeta(service.isActive);
      const uploadSummary = getServiceUploadSummary(config);

      return {
        service,
        config,
        pricingMode,
        pricingMeta,
        visibilityMeta,
        uploadSummary,
        summary: buildServiceManagementSummary(config),
      };
    })
    .filter((entry) => typeFilter === "all" || entry.pricingMode === typeFilter);

  const activeCount = servicesWithSummary.filter((entry) => entry.service.isActive).length;
  const hiddenCount = servicesWithSummary.length - activeCount;
  const uploadEnabledCount = servicesWithSummary.filter(
    (entry) => entry.uploadSummary.hasUploads,
  ).length;

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Service Management
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Leistungen
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Schnellere Pflege fuer Sichtbarkeit, Preislogik, Kundenoptionen und
              Upload-Anforderungen.
            </p>
          </div>

          <Link
            href="/admin/services/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Neue Leistung
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              Aktiv
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {activeCount}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Versteckt
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {hiddenCount}
            </p>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
              Mit Uploads
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {uploadEnabledCount}
            </p>
          </div>
        </div>
      </div>

      <form className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_220px_240px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Nach Name, Slug oder Beschreibung suchen"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm outline-none transition-colors focus:border-slate-900"
            />
          </div>

          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
          >
            <option value="all">Alle Status</option>
            <option value="active">Nur aktiv</option>
            <option value="hidden">Nur versteckt</option>
          </select>

          <select
            name="type"
            defaultValue={typeFilter}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition-colors focus:border-slate-900"
          >
            <option value="all">Alle Preismodelle</option>
            <option value="fixed">Festpreis</option>
            <option value="quantity_tiers">Preis pro Stueckzahl</option>
            <option value="area">Preis pro m2</option>
            <option value="option_based">Preis nach Auswahl</option>
            <option value="custom_quote">Preis auf Anfrage</option>
          </select>

          <button
            type="submit"
            className="rounded-full bg-slate-950 px-5 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-slate-800"
          >
            Filtern
          </button>
        </div>
      </form>

      {servicesWithSummary.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Keine Leistungen mit diesen Filtern gefunden
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {servicesWithSummary.map(
            ({
              service,
              pricingMeta,
              visibilityMeta,
              uploadSummary,
              summary,
            }) => (
              <div
                key={service.id}
                className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                        {service.name}
                      </h2>
                      <span
                        className={`inline-flex rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] ${visibilityMeta.badgeClassName}`}
                      >
                        {visibilityMeta.label}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] ${pricingMeta.badgeClassName}`}
                      >
                        {pricingMeta.label}
                      </span>
                      {uploadSummary.hasUploads && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
                          <Upload className="h-4 w-4" />
                          {uploadSummary.label}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="font-medium text-slate-700">
                        /services/{service.slug}
                      </span>
                      <span>Grundpreis: {service.basePrice.toFixed(2)} EUR</span>
                      <span>{service.options.length} Kundenfelder</span>
                    </div>

                    <p className="max-w-4xl text-sm leading-6 text-slate-600">
                      {summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link
                      href={`/admin/services/${service.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                    >
                      <Settings2 className="h-4 w-4" />
                      Bearbeiten
                    </Link>
                    <Link
                      href={`/admin/services/${service.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                    >
                      <Layers3 className="h-4 w-4" />
                      Optionen
                    </Link>
                    <form action={duplicateService}>
                      <input type="hidden" name="serviceId" value={service.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                      >
                        <Copy className="h-4 w-4" />
                        Duplizieren
                      </button>
                    </form>
                    <form action={toggleServiceVisibility}>
                      <input type="hidden" name="serviceId" value={service.id} />
                      <input
                        type="hidden"
                        name="nextIsActive"
                        value={service.isActive ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-slate-800"
                      >
                        {service.isActive ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Verstecken
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Anzeigen
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
