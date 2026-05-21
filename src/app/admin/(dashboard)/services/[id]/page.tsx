import Link from "next/link";
import { ArrowLeft, Layers3, Settings2, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import OptionsBuilder from "@/components/admin/OptionsBuilder";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  buildServiceManagementSummary,
  getServicePricingModeMeta,
  getServiceUploadSummary,
  getServiceVisibilityMeta,
} from "@/lib/admin/service-display";
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

  if (!service) return notFound();

  const config = normalizeServiceConfiguration(service);
  const pricingMeta = getServicePricingModeMeta(config.pricing.mode);
  const uploadSummary = getServiceUploadSummary(config);
  const visibilityMeta = getServiceVisibilityMeta(service.isActive);
  const summary = buildServiceManagementSummary(config);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 transition-colors hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zur Service-Liste
      </Link>

      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Kundenoptionen verwalten
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              {service.name}
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-slate-600">
              {summary}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/admin/services/${service.id}/edit`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
          >
            <Settings2 className="h-4 w-4" />
            Einstellungen
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
            <Layers3 className="h-4 w-4" />
            Kundenoptionen
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Felder
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {service.options.length}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Grundpreis
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {service.basePrice.toFixed(2)} EUR
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Service-Slug
          </p>
          <p className="mt-3 text-lg font-bold tracking-tight text-slate-950">
            /services/{service.slug}
          </p>
        </div>
      </div>

      <OptionsBuilder serviceId={service.id} options={service.options} />
    </div>
  );
}
