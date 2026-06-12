import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ServiceWorkspace from "@/components/services/ServiceWorkspace";
import { normalizeServiceConfiguration } from "@/lib/services/configuration/normalize";

export default async function ServiceDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const service = await prisma.service.findUnique({
    where: { slug },
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

  if (!service || !service.isActive) {
    return notFound();
  }

  const config = normalizeServiceConfiguration(service);

  return (
    <div className="bg-slate-50 py-8 sm:py-10 lg:py-12">
      <div className="public-container">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Link>

        <div className="mt-6 lg:mt-8">
          <ServiceWorkspace service={service} config={config} />
        </div>
      </div>
    </div>
  );
}
