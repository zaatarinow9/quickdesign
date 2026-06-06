import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ServicesSection() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    take: 3,
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
  });

  if (services.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="public-container">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-eyebrow">Ausgewaehlte Leistungen</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Saubere Konfiguratoren fuer die Leistungen, die am haeufigsten
              angefragt werden.
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
          >
            Alle Leistungen ansehen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.slug}`}
              className="group surface-card overflow-hidden transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative h-60 overflow-hidden bg-slate-100">
                <img
                  src={service.image}
                  alt={service.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {service.name}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">
                    {service.description}
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
                  Details ansehen
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
