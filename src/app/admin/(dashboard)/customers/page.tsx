import { format } from "date-fns";
import { Building2, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { requireAdminPermission } from "@/lib/admin/auth";
import { canManageCustomers } from "@/lib/admin/permissions";
import { getOrderFinancials } from "@/lib/orders/finance";
import { prisma } from "@/lib/prisma";

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
    <div className="space-y-8">
      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Kunden"
          title="Kundenprofile"
          description="Kundenprofile durchsuchen, einsehen und fuer manuelle Auftraege nutzen."
          actions={
            <>
              <Link href="/admin/orders/new" className={getAdminButtonClassName("secondary")}>
                <Plus className="h-4 w-4" />
                Neuer Auftrag
              </Link>
              {showManageActions && (
                <Link href="/admin/customers/new" className={getAdminButtonClassName("primary")}>
                  <Plus className="h-4 w-4" />
                  Neuer Kunde
                </Link>
              )}
            </>
          }
        />
      </AdminCard>

      <AdminCard className="p-4">
        <form className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Nach Name, Firma, E-Mail oder Telefon suchen"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            />
          </div>
          <button type="submit" className={getAdminButtonClassName("primary")}>
            Filtern
          </button>
        </form>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              icon={Users}
              title="Keine Kunden gefunden."
              description="Passen Sie die Suche an oder legen Sie einen neuen Kunden an."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80">
                  <th className="p-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Kunde
                  </th>
                  <th className="p-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Kontakt
                  </th>
                  <th className="p-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Bestellungen
                  </th>
                  <th className="p-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Umsatz
                  </th>
                  <th className="p-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="p-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Aktualisiert
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {customers.map((customer) => {
                  const totalSales = customer.orders.reduce((sum, order) => {
                    return sum + getOrderFinancials(order).totalGross;
                  }, 0);

                  return (
                    <tr
                      key={customer.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-950/40"
                    >
                      <td className="p-5">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="flex items-center gap-4"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {customer.name[0] ?? "K"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                              {customer.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {customer.companyName || "Privatkunde"}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="p-5 text-sm text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-slate-950 dark:text-slate-50">
                          {customer.email || "Keine E-Mail"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {customer.phone || "Kein Telefon"}
                        </p>
                      </td>
                      <td className="p-5 text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {customer._count.orders}
                      </td>
                      <td className="p-5 text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {totalSales.toFixed(2)} EUR
                      </td>
                      <td className="p-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold ${
                            customer.isActive
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                              : "border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {customer.isActive ? "Aktiv" : "Archiviert"}
                        </span>
                      </td>
                      <td className="p-5 text-sm text-slate-500 dark:text-slate-300">
                        {format(new Date(customer.updatedAt), "dd.MM.yyyy HH:mm")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
