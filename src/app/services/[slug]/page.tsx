import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ServiceWorkspace from "@/components/services/ServiceWorkspace";
import { normalizeServiceConfiguration } from "@/lib/services/configuration/normalize";

export default async function ServiceDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const service = await prisma.service.findUnique({
    where: { slug },
    include: {
      options: {
        include: {
          values: {
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
          }
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      }
    }
  });

  if (!service || !service.isActive) return notFound();
  const config = normalizeServiceConfiguration(service);

  return (
    <div className="w-full min-h-screen bg-neutral-50 py-12">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <Link href="/services" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-950 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
        </Link>

        {/* استدعاء مساحة العمل الذكية */}
        <ServiceWorkspace service={service} config={config} />
      </div>
    </div>
  );
}
