import { ShoppingBag } from "lucide-react";
import { formatDateTime, formatEuro } from "@/lib/documents/format";
import { Badge, Card, EmptyState } from "@/components/admin/ui";

export const orderLabels: Record<string, string> = {
  bezahlt: "مدفوع – بانتظار الطباعة",
  in_produktion: "قيد الطباعة",
  versendet: "تم الشحن",
  abholbereit: "جاهز للاستلام",
  abgeschlossen: "مكتمل",
  storniert: "ملغى",
};

export type OrderRow = {
  id: string;
  number: string;
  status: string;
  lang: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  shipping_method: string | null;
  shipping_address: Record<string, string | null> | null;
  items: { description: string; quantity: number; amount: number }[];
  amount_total: number;
  livemode: boolean;
  created_at: string;
};

export function OrdersList({ orders, action, compact = false }: { orders: OrderRow[]; action: (fd: FormData) => Promise<void>; compact?: boolean }) {
  if (!orders.length) return <Card><EmptyState icon={ShoppingBag} title="لا توجد طلبات بعد" text="بمجرد الدفع في المتجر تظهر الطلبات هنا، ويصلك بريد إلكتروني أيضاً." /></Card>;
  return (
    <Card padded={false}>
      <ul className="divide-y divide-ink/[0.06]">
        {orders.map((o) => {
          const a = o.shipping_address ?? {};
          const express = /express/i.test(o.shipping_method ?? "");
          return (
            <li key={o.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-start">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {o.number}
                  {!o.livemode ? <Badge tone="amber">تجريبي</Badge> : null}
                  {express ? <Badge tone="red">سريع</Badge> : null}
                  <Badge tone={o.status === "bezahlt" ? "pink" : o.status === "storniert" ? "gray" : o.status === "abgeschlossen" ? "green" : "blue"}>{orderLabels[o.status] ?? o.status}</Badge>
                </p>
                <p className="mt-0.5 text-xs text-stone-dark">
                  <span className="ltr">{formatDateTime(o.created_at)}</span>
                </p>
                {!compact ? (
                  <>
                    <p className="mt-2 text-sm">
                      <strong>{o.name}</strong>
                      <br />
                      {o.shipping_method}
                      <br />
                      {[a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-stone-dark">
                      {o.phone ? <a href={`tel:${o.phone}`} className="ltr hover:text-accent">{o.phone}</a> : null}
                      {o.email ? <> · <a href={`mailto:${o.email}`} className="hover:text-accent">{o.email}</a></> : null}
                    </p>
                  </>
                ) : null}
              </div>
              <ul className="space-y-1 text-sm">
                {o.items.map((i, k) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span><strong>{i.quantity}×</strong> {i.description}</span>
                    <span className="ltr tabular-nums text-stone-dark">{formatEuro(i.amount / 100)}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-3 border-t border-ink/[0.06] pt-1 font-semibold">
                  <span>المجموع</span>
                  <span className="ltr tabular-nums">{formatEuro(o.amount_total / 100)}</span>
                </li>
              </ul>
              <form action={action} className="flex items-center gap-2">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className="adm-input h-9 py-0 text-sm">
                  {Object.entries(orderLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <button type="submit" className="adm-btn adm-btn-ghost adm-btn-sm">حفظ</button>
              </form>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
