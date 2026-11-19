import { ShoppingBag } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { formatDateTime, formatEuro } from "@/lib/documents/format";
import { setShopOrderStatus } from "@/app/admin/shop-actions";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/admin/ui";
import { SHOP_URL } from "@/lib/shop/config";

export const metadata = { title: "Shop-Bestellungen" };

const labels: Record<string, string> = {
  bezahlt: "Bezahlt – zu drucken",
  in_produktion: "In Produktion",
  versendet: "Versendet",
  abholbereit: "Abholbereit",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

type Row = {
  id: string;
  number: string;
  status: string;
  lang: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  shipping_method: string | null;
  shipping_address: Record<string, string | null>;
  items: { description: string; quantity: number; amount: number }[];
  amount_total: number;
  livemode: boolean;
  created_at: string;
};

export default async function ShopOrdersPage() {
  await requireAdmin();
  const { data } = await db().from("shop_orders").select("*").order("created_at", { ascending: false }).limit(500);
  const orders = (data ?? []) as Row[];
  const live = orders.filter((o) => o.livemode && o.status !== "storniert");
  const open = orders.filter((o) => ["bezahlt", "in_produktion", "abholbereit"].includes(o.status));
  const pieces = live.reduce((s, o) => s + o.items.reduce((x, i) => x + i.quantity, 0), 0);

  return (
    <>
      <PageHeader
        title="Shop-Bestellungen"
        description={
          <>
            Bestellungen aus <a href={SHOP_URL} className="text-accent hover:underline">shop.quickdesign24.de</a> (Kollektion 8.12.). Neue Bestellungen kommen zusätzlich per E-Mail.
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Umsatz (live)" value={formatEuro(live.reduce((s, o) => s + o.amount_total, 0) / 100)} icon={ShoppingBag} tone="accent" />
        <Stat label="Offene Bestellungen" value={open.length} tone="amber" />
        <Stat label="Verkaufte Teile" value={pieces} tone="green" />
      </div>
      <Card padded={false}>
        {orders.length ? (
          <ul className="divide-y divide-ink/[0.06]">
            {orders.map((o) => {
              const a = o.shipping_address ?? {};
              return (
                <li key={o.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-start">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {o.number}
                      {!o.livemode ? <Badge tone="amber">Test</Badge> : null}
                      <Badge tone={o.status === "bezahlt" ? "pink" : o.status === "storniert" ? "gray" : o.status === "abgeschlossen" ? "green" : "blue"}>{labels[o.status] ?? o.status}</Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-stone-dark">
                      {formatDateTime(o.created_at)} · {o.lang === "ar" ? "Arabisch" : "Deutsch"}
                    </p>
                    <p className="mt-2 text-sm">
                      <strong>{o.name}</strong>
                      <br />
                      {o.shipping_method}
                      <br />
                      {[a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-stone-dark">
                      {o.phone ? <a href={`tel:${o.phone}`} className="hover:text-accent">{o.phone}</a> : null}
                      {o.email ? <> · <a href={`mailto:${o.email}`} className="hover:text-accent">{o.email}</a></> : null}
                    </p>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {o.items.map((i, k) => (
                      <li key={k} className="flex justify-between gap-3">
                        <span>
                          <strong>{i.quantity}×</strong> {i.description}
                        </span>
                        <span className="tabular-nums text-stone-dark">{formatEuro(i.amount / 100)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between gap-3 border-t border-ink/[0.06] pt-1 font-semibold">
                      <span>Gesamt</span>
                      <span className="tabular-nums">{formatEuro(o.amount_total / 100)}</span>
                    </li>
                  </ul>
                  <form action={setShopOrderStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <select name="status" defaultValue={o.status} className="adm-input h-9 py-0 text-sm">
                      {Object.entries(labels).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="adm-btn adm-btn-ghost adm-btn-sm">
                      Speichern
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={ShoppingBag} title="Noch keine Bestellungen" text="Sobald im Shop bezahlt wird, erscheinen die Bestellungen hier." />
        )}
      </Card>
    </>
  );
}
