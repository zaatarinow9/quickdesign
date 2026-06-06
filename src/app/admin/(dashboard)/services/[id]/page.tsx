import Link from "next/link";
import { ArrowLeft, Layers3, Settings2, Upload } from "lucide-react";
import { notFound } from "next/navigation";
import OptionsBuilder from "@/components/admin/OptionsBuilder";
import {
  AdminBadge,
  AdminCard,
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
} from "@/lib/admin/service-display";
import { prisma } from "@/lib/prisma";
import { normalizeServiceConfiguration } from "@/lib/services/configuration/normalize";

export default async function ManageService({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPermission("canManageServices");
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      options: {
        include: {
          values: {
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!service) {
    return notFound();
  }

  const config = normalizeServiceConfiguration(service);
  const pricingMeta = getServicePricingModeMeta(config.pricing.mode);
  const uploadSummary = getServiceUploadSummary(config);
  const visibilityMeta = getServiceVisibilityMeta(service.isActive);
  const summary = buildServiceManagementSummary(config);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zur Service-Liste
      </Link>

      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Kundenoptionen verwalten"
          title={service.name}
          description={summary}
          actions={
            <>
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
            </>
          }
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/admin/services/${service.id}/edit`}
            className={getAdminButtonClassName("secondary")}
          >
            <Settings2 className="h-4 w-4" />
            Einstellungen
          </Link>
          <span className={getAdminButtonClassName("primary")}>
            <Layers3 className="h-4 w-4" />
            Kundenoptionen
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <AdminStatCard label="Felder" value={service.options.length} tone="slate" />
          <AdminStatCard
            label="Grundpreis"
            value={`${service.basePrice.toFixed(2)} EUR`}
            tone="blue"
          />
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
              Service-Slug
            </p>
            <p className="mt-3 break-words text-base font-semibold text-slate-950 dark:text-slate-50">
              /services/{service.slug}
            </p>
          </div>
        </div>
      </AdminCard>

      <OptionsBuilder serviceId={service.id} options={service.options} />
    </div>
  );
}
