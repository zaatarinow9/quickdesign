import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Pencil,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin/auth";
import { canManageCustomers } from "@/lib/admin/permissions";
import { formatCustomerLocation } from "@/lib/customers";
import { getOrderFinancials } from "@/lib/orders/finance";
import { prisma } from "@/lib/prisma";

export default async function CustomerDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string; updated?: string }>;
}) {
  const currentUser = await requireAdminPermission("canViewCustomers");
  const { id } = await params;
  const pageParams = searchParams ? await searchParams : {};
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          assignedTo: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { orders: true },
      },
    },
  });

  if (!customer) {
    return notFound();
  }

  const totalSales = customer.orders.reduce((sum, order) => {
    return sum + getOrderFinancials(order).totalGross;
  }, 0);
  const location = formatCustomerLocation(customer);
  const showManageActions = canManageCustomers(currentUser);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:text-neutral-950"
      >
        <ArrowLeft className="h-3 w-3" /> Zurueck zu Kunden
      </Link>

      {pageParams.created && (
        <div className="border border-green-100 bg-green-50 p-4 text-xs font-bold uppercase tracking-widest text-green-700">
          Kunde wurde angelegt.
        </div>
      )}
      {pageParams.updated && (
        <div className="border border-green-100 bg-green-50 p-4 text-xs font-bold uppercase tracking-widest text-green-700">
          Kunde wurde aktualisiert.
        </div>
      )}

      <div className="flex flex-col gap-6 border-b border-neutral-100 pb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter text-neutral-950">
            {customer.name}
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
            {customer.companyName || "Kundenprofil"} · Angelegt am{" "}
            {format(new Date(customer.createdAt), "dd.MM.yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/orders/new?customerId=${customer.id}`}
            className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-600 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            <ShoppingBag className="h-3 w-3" /> Neuer Auftrag
          </Link>
          {showManageActions && (
            <Link
              href={`/admin/customers/${customer.id}/edit`}
              className="inline-flex items-center gap-2 bg-neutral-950 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
            >
              <Pencil className="h-3 w-3" /> Bearbeiten
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Stammdaten
          </h2>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <Building2 className="mt-1 h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Firma
                </p>
                <p className="mt-2 text-sm font-bold text-neutral-950">
                  {customer.companyName || "Nicht hinterlegt"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="mt-1 h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  E-Mail
                </p>
                <p className="mt-2 text-sm font-bold text-neutral-950">
                  {customer.email || "Nicht hinterlegt"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="mt-1 h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Telefon
                </p>
                <p className="mt-2 text-sm font-bold text-neutral-950">
                  {customer.phone || "Nicht hinterlegt"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Anschrift
                </p>
                <p className="mt-2 text-sm font-bold text-neutral-950">
                  {customer.address || "Nicht hinterlegt"}
                </p>
                {location && (
                  <p className="mt-1 text-[11px] font-bold text-neutral-500">
                    {location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Steuer-ID
                </p>
                <p className="mt-2 text-sm font-bold text-neutral-950">
                  {customer.taxId || "Nicht hinterlegt"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Kennzahlen
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <div className="border border-neutral-100 bg-neutral-50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Auftraege
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tighter text-neutral-950">
                {customer._count.orders}
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Gesamtumsatz
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tighter text-neutral-950">
                {totalSales.toFixed(2)} EUR
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Status
              </p>
              <p className="mt-3 text-sm font-bold uppercase tracking-widest text-neutral-950">
                {customer.isActive ? "Aktiv" : "Archiviert"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Notizen
          </h2>
          <p className="text-sm leading-7 text-neutral-700">
            {customer.notes || "Noch keine Notizen hinterlegt."}
          </p>
        </div>
      </div>

      <div className="border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-neutral-400">
          Auftraege
        </h2>

        <div className="space-y-4">
          {customer.orders.map((order) => {
            const financials = getOrderFinancials(order);

            return (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="grid gap-4 border border-neutral-200 bg-neutral-50 p-5 transition-colors hover:border-neutral-950 hover:bg-white md:grid-cols-[140px_minmax(0,1fr)_140px_180px]"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Bestellnr.
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    #{order.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    {order.internalStatus} / {order.status}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Betrag
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    {financials.totalGross.toFixed(2)} {financials.currency}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Zuweisung
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    {order.assignedTo?.name || "Nicht zugewiesen"}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-neutral-500">
                    {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
              </Link>
            );
          })}

          {customer.orders.length === 0 && (
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-300">
              Fuer diesen Kunden gibt es noch keine Auftraege.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
