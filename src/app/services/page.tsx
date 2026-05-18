import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const revalidate = 60; // Cache for 60 seconds

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  return (
    <div className="w-full min-h-screen bg-neutral-50 pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-20 text-center">
          <span className="text-neutral-500 uppercase tracking-widest text-xs font-bold mb-4 block">
            Unser Sortiment
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-neutral-950 tracking-tighter">
            Alle Leistungen
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service) => (
            <Link 
              key={service.id} 
              href={`/services/${service.slug}`}
              className="group relative w-full h-[500px] overflow-hidden bg-neutral-100 block shadow-sm"
            >
              <div className="absolute inset-0 bg-neutral-950/10 z-10 transition-opacity duration-500 group-hover:opacity-30"></div>
              <img 
                src={service.image} 
                alt={service.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 w-full p-8 z-20 translate-y-2 transition-transform duration-500 group-hover:translate-y-0">
                <div className="bg-white/95 backdrop-blur-md p-6 shadow-xl">
                  <h3 className="text-xl font-bold text-neutral-950 mb-2">{service.name}</h3>
                  <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-4">
                    Ab {service.basePrice.toFixed(2)} €
                  </p>
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
                    Konfigurieren <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {services.length === 0 && (
            <div className="col-span-full text-center py-20 text-neutral-500 text-sm font-bold uppercase tracking-widest">
              Derzeit sind keine Leistungen verfügbar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}