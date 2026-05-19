import { ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";
import { createManualOrder } from "@/app/actions/order";
import AdminManualOrderForm from "@/components/admin/AdminManualOrderForm";
import { requireAdminPermission } from "@/lib/admin/auth";
import { hasAdminPermission } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import { normalizeServiceConfiguration } from "@/lib/services/configuration/normalize";

export default async function AdminNewOrderPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; customerId?: string }>;
}) {
  const currentUser = await requireAdminPermission("canCreateManualOrders");
  const params = searchParams ? await searchParams : {};
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: {
      options: {
        include: {
          values: true,
        },
      },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
    },
  });
  const staffOptions = await prisma.adminUser.findMany({
    where: { isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  return (
    <div className="space-y-8">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:text-neutral-950"
      >
        <ArrowLeft className="h-3 w-3" /> Zurueck zu Auftraegen
      </Link>

      <div className="border-b border-neutral-100 pb-8">
        <h1 className="flex items-center gap-4 text-4xl font-bold uppercase tracking-tighter">
          <PlusCircle className="h-10 w-10" /> Manuellen Auftrag anlegen
        </h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
          Interne Bestellungen mit Kundenbezug, Netto/Brutto und Dokumentbasis erfassen
        </p>
      </div>

      {params.error === "invalid" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Bitte pruefen Sie Kunde und Positionen.
        </div>
      )}
      {params.error === "customer" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Der ausgewaehlte Kunde konnte nicht gefunden oder erstellt werden.
        </div>
      )}
      {params.error === "service" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Mindestens eine gewaehlte Leistung ist nicht mehr verfuegbar.
        </div>
      )}
      {params.error === "assignee" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Die gewaehlte Zuweisung ist ungueltig.
        </div>
      )}

      <AdminManualOrderForm
        action={createManualOrder}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          basePrice: service.basePrice,
          config: normalizeServiceConfiguration(service),
        }))}
        customers={customers}
        staffOptions={staffOptions}
        initialCustomerId={params.customerId}
        canApplyDiscounts={hasAdminPermission(currentUser, "canApplyDiscounts")}
        canEditFinancials={hasAdminPermission(currentUser, "canEditFinancials")}
        canAssignOrders={hasAdminPermission(currentUser, "canAssignOrders")}
      />
    </div>
  );
}
