import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import {
  CheckCircle2,
  CircleDot,
  Clock,
  Eye,
  Package,
  Truck,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { claimOrder } from "@/app/actions/order";
import { requireAdminPermission } from "@/lib/admin/auth";
import { hasAdminPermission } from "@/lib/admin/permissions";

const STATUS_MAP: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  PAID: {
    label: "Neu / Bezahlt",
    icon: CircleDot,
    color: "text-blue-600 bg-blue-50 border-blue-100",
  },
  PROCESSING: {
    label: "In Produktion",
    icon: Clock,
    color: "text-orange-600 bg-orange-50 border-orange-100",
  },
  SHIPPED: {
    label: "Versendet",
    icon: Truck,
    color: "text-purple-600 bg-purple-50 border-purple-100",
  },
  DELIVERED: {
    label: "Zugestellt",
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50 border-green-100",
  },
  CANCELED: {
    label: "Storniert",
    icon: CircleDot,
    color: "text-red-600 bg-red-50 border-red-100",
  },
};

const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "mine", label: "Meine" },
  { value: "unassigned", label: "Nicht zugewiesen" },
] as const;

type OrderFilter = (typeof FILTERS)[number]["value"];

type OrderWithCount = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  createdAt: Date;
  status: string;
  internalStatus: string;
  priority: string;
  totalAmount: number;
  assignedToId: string | null;
  assignedTo: {
    name: string;
  } | null;
  _count: {
    items: number;
  };
};

function normalizeFilter(value: string | undefined): OrderFilter {
  return FILTERS.some((filter) => filter.value === value)
    ? (value as OrderFilter)
    : "all";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const currentUser = await requireAdminPermission("canManageOrders");
  const params = searchParams ? await searchParams : {};
  const activeFilter = normalizeFilter(params.filter);
  const canClaimOrders = hasAdminPermission(currentUser, "canClaimOrders");

  const orders: OrderWithCount[] = await prisma.order.findMany({
    where:
      activeFilter === "mine"
        ? { assignedToId: currentUser.id }
        : activeFilter === "unassigned"
          ? { assignedToId: null }
          : undefined,
    include: {
      assignedTo: {
        select: { name: true },
      },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-12 p-12">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-8">
        <div>
          <h1 className="flex items-center gap-4 text-4xl font-bold uppercase tracking-tighter">
            <Package className="h-10 w-10" /> Auftragsverwaltung
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
            Bestellungen ansehen, uebernehmen und intern bearbeiten
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/orders?filter=${filter.value}`}
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

      <div className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1040px] text-left">
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
              const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PAID;
              const StatusIcon = statusInfo.icon;

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
                        {order.customerName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tighter text-neutral-950">
                          {order.customerName}
                        </p>
                        <p className="text-[10px] font-bold text-neutral-400">
                          {order.customerEmail}
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
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest ${statusInfo.color}`}
                      >
                        <StatusIcon className="h-3 w-3" /> {statusInfo.label}
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Intern: {order.internalStatus} | {order.priority}
                      </p>
                    </div>
                  </td>
                  <td className="p-6">
                    {order.assignedTo ? (
                      <span className="inline-flex items-center gap-2 border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                        <UserCheck className="h-3 w-3" /> {order.assignedTo.name}
                      </span>
                    ) : canClaimOrders ? (
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
                    {order.totalAmount.toFixed(2)} EUR
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
