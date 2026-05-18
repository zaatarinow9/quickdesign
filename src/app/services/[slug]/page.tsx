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
    <div className="min-h-screen w-full bg-neutral-50 py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" /> Zurueck zur Uebersicht
        </Link>

        <ServiceWorkspace service={service} config={config} />
      </div>
    </div>
  );
}
