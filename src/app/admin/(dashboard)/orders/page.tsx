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
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
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
] as const;

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
    <div className="space-y-8">
      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Auftragsverwaltung"
          title="Bestellungen und Produktion"
          description="Filterbare Auftragsliste mit Archiv, Belegtyp, Zeiträumen und Kundenbezug."
          actions={
            hasAdminPermission(currentUser, "canCreateManualOrders") ? (
              <Link href="/admin/orders/new" className={getAdminButtonClassName("primary")}>
                <Plus className="h-4 w-4" />
                Neuer Auftrag
              </Link>
            ) : null
          }
        />

        <div className="mt-6 flex flex-wrap gap-3">
          {FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={buildOrdersHref(params, { filter: filter.value })}
              className={
                activeFilter === filter.value
                  ? getAdminButtonClassName("primary")
                  : getAdminButtonClassName("secondary")
              }
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="p-4">
        <form className="space-y-4">
          <input type="hidden" name="filter" value={activeFilter} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="orderNumber"
                defaultValue={orderNumberQuery}
                placeholder="Bestellnummer"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="customer"
                defaultValue={customerQuery}
                placeholder="Kunde, E-Mail oder Firma"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
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
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
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
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
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
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            >
              <option value="all">Alle Belegtypen</option>
              <option value="ORDER">Auftrag</option>
              <option value="OFFER">Angebot</option>
              <option value="INVOICE">Rechnung</option>
            </select>
            <select
              name="priority"
              defaultValue={priorityFilter}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            >
              <option value="all">Alle Prioritäten</option>
              <option value="LOW">Niedrig</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Hoch</option>
              <option value="URGENT">Dringend</option>
            </select>
            <select
              name="internalStatus"
              defaultValue={internalStatusFilter}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            >
              <option value="all">Alle internen Status</option>
              <option value="NEW">Neu</option>
              <option value="IN_REVIEW">In Prüfung</option>
              <option value="IN_PRODUCTION">In Produktion</option>
              <option value="WAITING_CUSTOMER">Wartet auf Kunde</option>
              <option value="READY">Bereit</option>
              <option value="DONE">Erledigt</option>
            </select>
            <input
              name="from"
              type="date"
              defaultValue={fromDateValue}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            />
            <input
              name="to"
              type="date"
              defaultValue={toDateValue}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            />
            <select
              name="archived"
              defaultValue={archivedFilter}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            >
              <option value="active">Aktive Aufträge</option>
              <option value="all">Aktiv + Archiv</option>
              <option value="only">Nur Archiv</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className={getAdminButtonClassName("primary")}>
              Filtern
            </button>
            <Link href="/admin/orders" className={getAdminButtonClassName("secondary")}>
              Zurücksetzen
            </Link>
          </div>
        </form>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {orders.length} Aufträge gefunden
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Archivfilter:{" "}
          {archivedFilter === "active"
            ? "aktiv"
            : archivedFilter === "all"
              ? "alle"
              : "nur archiv"}
        </p>
      </div>

      <AdminCard className="overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              icon={Package}
              title="Keine Bestellungen gefunden."
              description="Passen Sie die Filter an oder prüfen Sie einen anderen Zeitraum."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1480px] w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80">
                  <th className="p-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Order-ID
                  </th>
                  <th className="p-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Kunde
                  </th>
                  <th className="p-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Datum
                  </th>
                  <th className="p-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="p-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Zahlung
                  </th>
                  <th className="p-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Dokument
                  </th>
                  <th className="p-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Zuweisung
                  </th>
                  <th className="p-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Betrag
                  </th>
                  <th className="p-6 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
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
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-950/40"
                    >
                      <td className="p-6 font-mono text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        #{order.orderNumber}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {order.customerName[0] ?? "K"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                              {order.customerName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {order.customer?.companyName || order.customerEmail || "Kein Kontakt"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-sm text-slate-500 dark:text-slate-300">
                        {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                      </td>
                      <td className="p-6">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${statusInfo.badgeClassName}`}
                          >
                            {statusInfo.label}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${internalStatusInfo.badgeClassName}`}
                          >
                            {internalStatusInfo.label}
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Priorität: {order.priority}
                          </p>
                          {order.isArchived && (
                            <p className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-200">
                              <Archive className="h-3 w-3" />
                              Archiviert
                              {order.archivedAt
                                ? ` am ${format(new Date(order.archivedAt), "dd.MM.yyyy")}`
                                : ""}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                          {PAYMENT_STATUS_LABELS[paymentStatus]}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {DOCUMENT_TYPE_LABELS[documentType]}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {order._count.items} Positionen
                          </p>
                        </div>
                      </td>
                      <td className="p-6">
                        {order.assignedTo ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                            <UserCheck className="h-3.5 w-3.5" />
                            {order.assignedTo.name}
                          </span>
                        ) : !order.isArchived && canClaimOrders ? (
                          <form action={claimOrder}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <button type="submit" className={getAdminButtonClassName("primary")}>
                              <UserCheck className="h-4 w-4" />
                              Übernehmen
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Nicht zugewiesen
                          </span>
                        )}
                      </td>
                      <td className="p-6 text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {formatCurrencyAmount(financials.totalGross, financials.currency)}
                      </td>
                      <td className="p-6 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className={getAdminButtonClassName("primary")}
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </Link>
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
