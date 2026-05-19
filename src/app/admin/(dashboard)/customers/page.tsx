import { format } from "date-fns";
import { Building2, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin/auth";
import { canManageCustomers } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import { getOrderFinancials } from "@/lib/orders/finance";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const currentUser = await requireAdminPermission("canViewCustomers");
  const params = searchParams ? await searchParams : {};
  const search = params.search?.trim() ?? "";
  const showManageActions = canManageCustomers(currentUser);

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { companyName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    include: {
      orders: {
        select: {
          id: true,
          totalAmount: true,
          subtotalNet: true,
          discountType: true,
          discountValue: true,
          discountAmount: true,
          taxRate: true,
          taxAmount: true,
          totalNet: true,
          totalGross: true,
          currency: true,
        },
      },
      _count: {
        select: { orders: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-neutral-100 pb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-4 text-4xl font-bold uppercase tracking-tighter">
            <Users className="h-10 w-10" /> Kunden
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
            Kundenprofile durchsuchen, einsehen und fuer manuelle Auftraege nutzen
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders/new"
            className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-600 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            <Plus className="h-3 w-3" /> Neuer Auftrag
          </Link>
          {showManageActions && (
            <Link
              href="/admin/customers/new"
              className="inline-flex items-center gap-2 bg-neutral-950 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
            >
              <Plus className="h-3 w-3" /> Neuer Kunde
            </Link>
          )}
        </div>
      </div>

      <form className="flex flex-col gap-3 border border-neutral-200 bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Nach Name, Firma, E-Mail oder Telefon suchen"
            className="w-full border border-neutral-200 bg-neutral-50 py-4 pl-11 pr-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>
        <button
          type="submit"
          className="bg-neutral-950 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
        >
          Filtern
        </button>
      </form>

      <div className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Kunde
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Kontakt
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Bestellungen
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Umsatz
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Status
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Aktualisiert
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {customers.map((customer) => {
              const totalSales = customer.orders.reduce((sum, order) => {
                return sum + getOrderFinancials(order).totalGross;
              }, 0);

              return (
                <tr key={customer.id} className="transition-colors hover:bg-neutral-50/60">
                  <td className="p-5">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="flex items-center gap-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 font-bold text-neutral-500">
                        {customer.name[0] ?? "K"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-950">
                          {customer.name}
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                          {customer.companyName || "Privatkunde"}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-5 text-xs text-neutral-600">
                    <p className="font-bold text-neutral-950">
                      {customer.email || "Keine E-Mail"}
                    </p>
                    <p className="mt-2 font-bold text-neutral-500">
                      {customer.phone || "Kein Telefon"}
                    </p>
                  </td>
                  <td className="p-5 text-sm font-bold text-neutral-950">
                    {customer._count.orders}
                  </td>
                  <td className="p-5 text-sm font-bold text-neutral-950">
                    {totalSales.toFixed(2)} EUR
                  </td>
                  <td className="p-5">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${
                        customer.isActive
                          ? "border border-green-200 bg-green-50 text-green-700"
                          : "border border-neutral-200 bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <Building2 className="h-3 w-3" />
                      {customer.isActive ? "Aktiv" : "Archiviert"}
                    </span>
                  </td>
                  <td className="p-5 text-[11px] font-bold text-neutral-500">
                    {format(new Date(customer.updatedAt), "dd.MM.yyyy HH:mm")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {customers.length === 0 && (
          <div className="flex flex-col items-center gap-4 p-20 text-center">
            <Users className="h-12 w-12 text-neutral-200" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-300">
              Keine Kunden gefunden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
