import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Settings2, Edit } from "lucide-react";

export default async function AdminServices() {
  const services = await prisma.service.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-neutral-950 uppercase tracking-tighter">Leistungen</h1>
        <Link href="/admin/services/new" className="flex items-center gap-2 bg-neutral-950 text-white px-6 py-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors">
          <Plus className="w-4 h-4" /> Neue Leistung
        </Link>
      </div>
      
      <div className="bg-white border border-neutral-200 shadow-sm w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-neutral-500 w-1/4">Name</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-neutral-500">Slug</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-neutral-500">Preis</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-neutral-500">Status</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                <td className="p-6 text-sm font-bold text-neutral-950">{service.name}</td>
                <td className="p-6 text-sm text-neutral-500">{service.slug}</td>
                <td className="p-6 text-sm font-bold text-neutral-950">{service.basePrice.toFixed(2)} €</td>
                <td className="p-6">
                  <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${service.isActive ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
                    {service.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="p-6 text-right space-x-2">
                  <Link href={`/admin/services/${service.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-950 text-xs font-bold uppercase tracking-widest transition-colors">
                    <Edit className="w-4 h-4" /> Bearbeiten
                  </Link>
                  <Link href={`/admin/services/${service.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-widest transition-colors">
                    <Settings2 className="w-4 h-4" /> Widgets
                  </Link>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-sm font-bold uppercase tracking-widest text-neutral-500">Keine Leistungen gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}