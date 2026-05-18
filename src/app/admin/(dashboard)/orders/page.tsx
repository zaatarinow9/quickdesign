import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Eye, Package, User, CircleDot, Truck, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string, icon: any, color: string }> = {
  PAID: { label: "Neu / Bezahlt", icon: CircleDot, color: "text-blue-600 bg-blue-50 border-blue-100" },
  PROCESSING: { label: "In Produktion", icon: Clock, color: "text-orange-600 bg-orange-50 border-orange-100" },
  SHIPPED: { label: "Versendet", icon: Truck, color: "text-purple-600 bg-purple-50 border-purple-100" },
  DELIVERED: { label: "Zugestellt", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-100" },
  CANCELED: { label: "Storniert", icon: CircleDot, color: "text-red-600 bg-red-50 border-red-100" },
};

interface OrderCount {
  items: number;
}

interface OrderWithCount {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  createdAt: Date;
  status: string;
  totalAmount: number;
  _count: OrderCount;
}

export default async function AdminOrdersPage() {
  const orders: OrderWithCount[] = await prisma.order.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-12 space-y-12">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-8">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter flex items-center gap-4">
            <Package className="w-10 h-10" /> Auftragsverwaltung
          </h1>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-2">
            Verwalten Sie Ihre eingehenden Bestellungen
          </p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Order-ID</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Kunde</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Datum</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Status</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Betrag</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PAID;
              const StatusIcon = statusInfo.icon;
              return (
                <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="p-6 font-mono text-[11px] font-bold">#{order.orderNumber}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 font-bold">
                        {order.customerName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-950 uppercase tracking-tighter">{order.customerName}</p>
                        <p className="text-[10px] text-neutral-400 font-bold">{order.customerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    {format(new Date(order.createdAt), "dd. MMM yyyy, HH:mm")}
                  </td>
                  <td className="p-6">
                    <span className={`inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 border rounded-full ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                    </span>
                  </td>
                  <td className="p-6 text-sm font-bold text-neutral-950">{order.totalAmount.toFixed(2)} €</td>
                  <td className="p-6 text-right">
                    <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-neutral-950 text-white px-5 py-2.5 hover:bg-neutral-800 transition-all shadow-lg">
                      <Eye className="w-3 h-3" /> Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-32 text-center flex flex-col items-center gap-4">
            <Package className="w-16 h-16 text-neutral-100" />
            <p className="text-[10px] font-bold uppercase text-neutral-300 tracking-[0.3em]">Keine Bestellungen gefunden</p>
          </div>
        )}
      </div>
    </div>
  );
}