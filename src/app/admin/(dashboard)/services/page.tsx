import Link from "next/link";
import {
  Copy,
  Eye,
  EyeOff,
  Layers3,
  Plus,
  Search,
  Settings2,
  Upload,
} from "lucide-react";
import { duplicateService, toggleServiceVisibility } from "@/app/actions/service";
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminStatCard,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  buildServiceManagementSummary,
  getServicePricingModeMeta,
  getServiceUploadSummary,
  getServiceVisibilityMeta,
  normalizeServicePricingModeValue,
} from "@/lib/admin/service-display";
import { prisma } from "@/lib/prisma";
import { normalizeServiceConfiguration } from "@/lib/services/configuration/normalize";

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
      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Service Management"
          title="Leistungen"
          description="Schnellere Pflege fuer Sichtbarkeit, Preislogik, Kundenoptionen und Upload-Anforderungen."
          actions={
            <Link href="/admin/services/new" className={getAdminButtonClassName("primary")}>
              <Plus className="h-4 w-4" />
              Neue Leistung
            </Link>
          }
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <AdminStatCard label="Aktiv" value={activeCount} tone="emerald" />
          <AdminStatCard label="Versteckt" value={hiddenCount} tone="slate" />
          <AdminStatCard label="Mit Uploads" value={uploadEnabledCount} tone="amber" />
        </div>
      </AdminCard>

      <AdminCard className="p-4">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_220px_240px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Nach Name, Slug oder Beschreibung suchen"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            />
          </div>

          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
          >
            <option value="all">Alle Status</option>
            <option value="active">Nur aktiv</option>
            <option value="hidden">Nur versteckt</option>
          </select>

          <select
            name="type"
            defaultValue={typeFilter}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
          >
            <option value="all">Alle Preismodelle</option>
            <option value="fixed">Festpreis</option>
            <option value="quantity_tiers">Preis pro Stueckzahl</option>
            <option value="area">Preis pro m2</option>
            <option value="option_based">Preis nach Auswahl</option>
            <option value="custom_quote">Preis auf Anfrage</option>
          </select>

          <button type="submit" className={getAdminButtonClassName("primary")}>
            Filtern
          </button>
        </form>
      </AdminCard>

      {servicesWithSummary.length === 0 ? (
        <AdminEmptyState
          icon={Layers3}
          title="Keine Leistungen mit diesen Filtern gefunden."
          description="Passen Sie Suche oder Filter an, oder legen Sie direkt eine neue Leistung an."
          action={
            <Link href="/admin/services/new" className={getAdminButtonClassName("secondary")}>
              <Plus className="h-4 w-4" />
              Neue Leistung
            </Link>
          }
        />
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
              <AdminCard key={service.id} className="p-6 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                        {service.name}
                      </h2>
                      <AdminBadge
                        tone={service.isActive ? "emerald" : "slate"}
                        className={visibilityMeta.badgeClassName}
                      >
                        {visibilityMeta.label}
                      </AdminBadge>
                      <AdminBadge tone="blue" className={pricingMeta.badgeClassName}>
                        {pricingMeta.label}
                      </AdminBadge>
                      {uploadSummary.hasUploads && (
                        <AdminBadge tone="amber">
                          <Upload className="h-4 w-4" />
                          {uploadSummary.label}
                        </AdminBadge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-300">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        /services/{service.slug}
                      </span>
                      <span>Grundpreis: {service.basePrice.toFixed(2)} EUR</span>
                      <span>{service.options.length} Kundenfelder</span>
                    </div>

                    <p className="max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link
                      href={`/admin/services/${service.id}/edit`}
                      className={getAdminButtonClassName("secondary")}
                    >
                      <Settings2 className="h-4 w-4" />
                      Bearbeiten
                    </Link>
                    <Link
                      href={`/admin/services/${service.id}`}
                      className={getAdminButtonClassName("secondary")}
                    >
                      <Layers3 className="h-4 w-4" />
                      Optionen
                    </Link>
                    <form action={duplicateService}>
                      <input type="hidden" name="serviceId" value={service.id} />
                      <button type="submit" className={getAdminButtonClassName("secondary")}>
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
                      <button type="submit" className={getAdminButtonClassName("primary")}>
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
              </AdminCard>
            ),
          )}
        </div>
      )}
    </div>
  );
}
