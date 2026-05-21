import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import {
  Archive,
  Eye,
  Package,
  Plus,
  Search,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { claimOrder } from "@/app/actions/order";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  getInternalOrderStatusMeta,
  getOrderStatusMeta,
} from "@/lib/admin/order-status";
import { hasAdminPermission } from "@/lib/admin/permissions";
import {
  formatCurrencyAmount,
  getOrderFinancials,
  getOrderPaymentStatus,
  normalizeDocumentType,
} from "@/lib/orders/finance";
import { prisma } from "@/lib/prisma";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unbezahlt",
  PARTIALLY_PAID: "Teilweise bezahlt",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ORDER: "Auftrag",
  OFFER: "Angebot",
  INVOICE: "Rechnung",
};

const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "mine", label: "Meine" },
  { value: "unassigned", label: "Nicht zugewiesen" },
];

type OrderFilter = (typeof FILTERS)[number]["value"];
type ArchivedFilter = "active" | "all" | "only";

type OrdersSearchParams = {
  filter?: string;
  orderNumber?: string;
  customer?: string;
  search?: string;
  status?: string;
  paymentStatus?: string;
  assignedToId?: string;
  from?: string;
  to?: string;
  documentType?: string;
  priority?: string;
  internalStatus?: string;
  archived?: string;
};

function normalizeFilter(value: string | undefined): OrderFilter {
  return FILTERS.some((filter) => filter.value === value)
    ? (value as OrderFilter)
    : "all";
}

function normalizeSelectFilter(value: string | undefined): string {
  const normalizedValue = value?.trim() ?? "";
  return normalizedValue || "all";
}

function normalizeArchivedFilter(value: string | undefined): ArchivedFilter {
  switch (value) {
    case "all":
    case "only":
      return value;
    default:
      return "active";
  }
}

function normalizeDateParam(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parseStartDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function parseExclusiveEndDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate() + 1,
  );
}

function buildOrdersHref(
  params: OrdersSearchParams,
  updates: Partial<Record<keyof OrdersSearchParams, string | undefined>>,
): string {
  const mergedParams: OrdersSearchParams = {
    ...params,
    ...updates,
  };
  const searchParams = new URLSearchParams();

  Object.entries(mergedParams).forEach(([key, value]) => {
    const normalizedValue = typeof value === "string" ? value.trim() : "";
    if (!normalizedValue) {
      return;
    }

    if (key === "filter" && normalizedValue === "all") {
      return;
    }

    if (key === "archived" && normalizedValue === "active") {
      return;
    }

    searchParams.set(key, normalizedValue);
  });

  const queryString = searchParams.toString();
  return queryString ? `/admin/orders?${queryString}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<OrdersSearchParams>;
}) {
  const currentUser = await requireAdminPermission("canManageOrders");
  const params = searchParams ? await searchParams : {};
  const activeFilter = normalizeFilter(params.filter);
  const orderNumberQuery = params.orderNumber?.trim() ?? "";
  const customerQuery = (params.customer ?? params.search)?.trim() ?? "";
  const paymentStatusFilter = normalizeSelectFilter(params.paymentStatus);
  const assignedToIdFilter = normalizeSelectFilter(params.assignedToId);
  const statusFilter = normalizeSelectFilter(params.status);
  const documentTypeFilter = normalizeSelectFilter(params.documentType);
  const priorityFilter = normalizeSelectFilter(params.priority);
  const internalStatusFilter = normalizeSelectFilter(params.internalStatus);
  const archivedFilter = normalizeArchivedFilter(params.archived);
  const fromDateValue = normalizeDateParam(params.from);
  const toDateValue = normalizeDateParam(params.to);
  const fromDate = parseStartDate(fromDateValue);
  const toExclusive = parseExclusiveEndDate(toDateValue);
  const canClaimOrders = hasAdminPermission(currentUser, "canClaimOrders");
  const filters: Prisma.OrderWhereInput[] = [];

  if (archivedFilter === "active") {
    filters.push({ isArchived: false });
  }

  if (archivedFilter === "only") {
    filters.push({ isArchived: true });
  }

  if (activeFilter === "mine") {
    filters.push({ assignedToId: currentUser.id });
  }

  if (activeFilter === "unassigned") {
    filters.push({ assignedToId: null });
  }

  if (orderNumberQuery) {
    const parsedOrderNumber = Number.parseInt(orderNumberQuery, 10);
    filters.push(
      Number.isFinite(parsedOrderNumber)
        ? { orderNumber: parsedOrderNumber }
        : { id: "__no_match__" },
    );
  }

  if (customerQuery) {
    filters.push({
      OR: [
        { customerName: { contains: customerQuery } },
        { customerEmail: { contains: customerQuery } },
        {
          customer: {
            is: {
              name: { contains: customerQuery },
            },
          },
        },
        {
          customer: {
            is: {
              companyName: { contains: customerQuery },
            },
          },
        },
      ],
    });
  }

  if (paymentStatusFilter !== "all") {
    filters.push(
      paymentStatusFilter === "PAID"
        ? {
            OR: [
              { paymentStatus: "PAID" },
              { paymentStatus: null, status: "PAID" },
            ],
          }
        : { paymentStatus: paymentStatusFilter },
    );
  }

  if (assignedToIdFilter !== "all") {
    filters.push({ assignedToId: assignedToIdFilter });
  }

  if (statusFilter !== "all") {
    filters.push({ status: statusFilter });
  }

  if (documentTypeFilter !== "all") {
    filters.push({ documentType: documentTypeFilter });
  }

  if (priorityFilter !== "all") {
    filters.push({ priority: priorityFilter });
  }

  if (internalStatusFilter !== "all") {
    filters.push({ internalStatus: internalStatusFilter });
  }

  if (fromDate || toExclusive) {
    filters.push({
      createdAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toExclusive ? { lt: toExclusive } : {}),
      },
    });
  }

  const where = filters.length > 0 ? { AND: filters } : undefined;
  const [orders, activeStaff] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        assignedTo: {
          select: { name: true },
        },
        archivedBy: {
          select: { name: true },
        },
        customer: {
          select: { companyName: true },
        },
        _count: { select: { items: true } },
      },
      orderBy: [{ isArchived: "asc" }, { createdAt: "desc" }],
    }),
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-neutral-100 pb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-4 text-4xl font-bold uppercase tracking-tighter">
            <Package className="h-10 w-10" /> Auftragsverwaltung
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
            Filterbare Auftragsliste mit Archiv, Belegtyp, Zeitraeumen und
            Kundenbezug
          </p>
        </div>

        {hasAdminPermission(currentUser, "canCreateManualOrders") && (
          <Link
            href="/admin/orders/new"
            className="inline-flex items-center gap-2 bg-neutral-950 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
          >
            <Plus className="h-3 w-3" /> Neuer Auftrag
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={buildOrdersHref(params, { filter: filter.value })}
            className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeFilter === filter.value
                ? "bg-neutral-950 text-white"
                : "border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-950"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <form className="space-y-4 border border-neutral-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="filter" value={activeFilter} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              name="orderNumber"
              defaultValue={orderNumberQuery}
              placeholder="Bestellnummer"
              className="w-full border border-neutral-200 bg-neutral-50 py-4 pl-11 pr-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              name="customer"
              defaultValue={customerQuery}
              placeholder="Kunde, E-Mail oder Firma"
              className="w-full border border-neutral-200 bg-neutral-50 py-4 pl-11 pr-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
          </div>
          <select
            name="status"
            defaultValue={statusFilter}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          >
            <option value="all">Alle Status</option>
            <option value="PAID">Neu</option>
            <option value="PROCESSING">In Produktion</option>
            <option value="SHIPPED">Versendet</option>
            <option value="DELIVERED">Zugestellt</option>
            <option value="CANCELED">Storniert</option>
          </select>
          <select
            name="paymentStatus"
            defaultValue={paymentStatusFilter}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          >
            <option value="all">Alle Zahlungen</option>
            <option value="UNPAID">Unbezahlt</option>
            <option value="PARTIALLY_PAID">Teilweise bezahlt</option>
            <option value="PAID">Bezahlt</option>
            <option value="REFUNDED">Erstattet</option>
          </select>
          <select
            name="assignedToId"
            defaultValue={assignedToIdFilter}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          >
            <option value="all">Alle Zuweisungen</option>
            {activeStaff.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <select
            name="documentType"
            defaultValue={documentTypeFilter}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          >
            <option value="all">Alle Belegtypen</option>
            <option value="ORDER">Auftrag</option>
            <option value="OFFER">Angebot</option>
            <option value="INVOICE">Rechnung</option>
          </select>
          <select
            name="priority"
            defaultValue={priorityFilter}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          >
            <option value="all">Alle Prioritaeten</option>
            <option value="LOW">Niedrig</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Hoch</option>
            <option value="URGENT">Dringend</option>
          </select>
          <select
            name="internalStatus"
            defaultValue={internalStatusFilter}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          >
            <option value="all">Alle internen Status</option>
            <option value="NEW">Neu</option>
            <option value="IN_REVIEW">In Pruefung</option>
            <option value="IN_PRODUCTION">In Produktion</option>
            <option value="WAITING_CUSTOMER">Wartet auf Kunde</option>
            <option value="READY">Bereit</option>
            <option value="DONE">Erledigt</option>
          </select>
          <input
            name="from"
            type="date"
            defaultValue={fromDateValue}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
          <input
            name="to"
            type="date"
            defaultValue={toDateValue}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
          <select
            name="archived"
            defaultValue={archivedFilter}
            className="border border-neutral-200 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          >
            <option value="active">Aktive Auftraege</option>
            <option value="all">Aktiv + Archiv</option>
            <option value="only">Nur Archiv</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="bg-neutral-950 px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
          >
            Filtern
          </button>
          <Link
            href="/admin/orders"
            className="border border-neutral-200 bg-white px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            Zuruecksetzen
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          {orders.length} Auftraege gefunden
        </p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          Archivfilter: {archivedFilter === "active" ? "aktiv" : archivedFilter === "all" ? "alle" : "nur archiv"}
        </p>
      </div>

      <div className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1480px] text-left">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Order-ID
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Kunde
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Datum
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Status
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Zahlung
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Dokument
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Zuweisung
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Betrag
              </th>
              <th className="p-6 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orders.map((order) => {
              const statusInfo = getOrderStatusMeta(order.status);
              const internalStatusInfo = getInternalOrderStatusMeta(
                order.internalStatus,
              );
              const financials = getOrderFinancials(order);
              const paymentStatus = getOrderPaymentStatus(order);
              const documentType = normalizeDocumentType(order.documentType);

              return (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-neutral-50/50"
                >
                  <td className="p-6 font-mono text-[11px] font-bold">
                    #{order.orderNumber}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 font-bold text-neutral-400">
                        {order.customerName[0] ?? "K"}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tighter text-neutral-950">
                          {order.customerName}
                        </p>
                        <p className="text-[10px] font-bold text-neutral-400">
                          {order.customer?.companyName || order.customerEmail || "Kein Kontakt"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    {format(new Date(order.createdAt), "dd. MMM yyyy, HH:mm")}
                  </td>
                  <td className="p-6">
                    <div className="space-y-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest ${statusInfo.badgeClassName}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest ${internalStatusInfo.badgeClassName}`}
                      >
                        {internalStatusInfo.label}
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Prioritaet: {order.priority}
                      </p>
                      {order.isArchived && (
                        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                          <Archive className="h-3 w-3" /> Archiviert
                          {order.archivedAt
                            ? ` am ${format(new Date(order.archivedAt), "dd.MM.yyyy")}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="inline-flex border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                      {PAYMENT_STATUS_LABELS[paymentStatus]}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-950">
                        {DOCUMENT_TYPE_LABELS[documentType]}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        {order._count.items} Positionen
                      </p>
                    </div>
                  </td>
                  <td className="p-6">
                    {order.assignedTo ? (
                      <span className="inline-flex items-center gap-2 border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                        <UserCheck className="h-3 w-3" /> {order.assignedTo.name}
                      </span>
                    ) : !order.isArchived && canClaimOrders ? (
                      <form action={claimOrder}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 bg-neutral-950 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
                        >
                          <UserCheck className="h-3 w-3" /> Uebernehmen
                        </button>
                      </form>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Nicht zugewiesen
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-sm font-bold text-neutral-950">
                    {formatCurrencyAmount(financials.totalGross, financials.currency)}
                  </td>
                  <td className="p-6 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-2 bg-neutral-950 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-neutral-800"
                    >
                      <Eye className="h-3 w-3" /> Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="flex flex-col items-center gap-4 p-32 text-center">
            <Package className="h-16 w-16 text-neutral-100" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-300">
              Keine Bestellungen gefunden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
