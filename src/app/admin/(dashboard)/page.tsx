import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const servicesCount = await prisma.service.count();

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold text-neutral-950 mb-10 uppercase tracking-tighter">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 border border-neutral-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">Aktive Leistungen</h3>
          <p className="text-5xl font-bold text-neutral-950">{servicesCount}</p>
        </div>
      </div>
    </div>
  );
}