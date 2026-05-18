import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import OptionsBuilder from "@/components/admin/OptionsBuilder";

export default async function ManageService({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-10 pb-10 border-b border-neutral-200">
        <span className="text-neutral-500 uppercase tracking-widest text-xs font-bold mb-2 block">
          Leistung verwalten
        </span>
        <h1 className="text-4xl font-bold text-neutral-950 tracking-tighter mb-4">
          {service.name}
        </h1>
        <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
          Grundpreis: {service.basePrice.toFixed(2)} EUR
        </p>
      </div>

      <OptionsBuilder serviceId={service.id} options={service.options} />
    </div>
  );
}
