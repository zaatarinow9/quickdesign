import Link from "next/link";
import { BadgePercent, Euro, Package, ShoppingBag, Timer, Truck } from "lucide-react";
import { requireShopAdmin, adminBase } from "@/lib/shop/admin";
import { db } from "@/lib/supabase/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { activeProducts, offerLive, preorderLive } from "@/lib/shop/schema";
import { formatEuro } from "@/lib/documents/format";
import { setOrderStatus } from "../actions";
import { Card, PageHeader, Stat } from "@/components/admin/ui";
import { OrdersList, type OrderRow } from "@/components/shop-admin/OrdersList";

export const metadata = { title: "Übersicht" };

const nowMs = () => Date.now();

export default async function ShopDashboard() {
  const admin = await requireShopAdmin();
  const base = await adminBase();
  const [store, { data }] = await Promise.all([getStoreFresh(), db().from("shop_orders").select("*").order("created_at", { ascending: false }).limit(300)]);
  const orders = (data ?? []) as OrderRow[];
  const now = nowMs();
  const live = orders.filter((o) => o.livemode && o.status !== "storniert");
  const today = new Date().toISOString().slice(0, 10);
  const todays = live.filter((o) => o.created_at.slice(0, 10) === today);
  const open = orders.filter((o) => ["bezahlt", "in_produktion", "abholbereit"].includes(o.status));
  const pieces = live.reduce((s, o) => s + o.items.reduce((x, i) => x + i.quantity, 0), 0);
  const s = store.settings;
  const liveOffers = store.offers.filter((o) => offerLive(o, now));

  return (
    <>
      <PageHeader eyebrow={`Angemeldet als ${admin.email}`} title="Übersicht" description="Umsatz, offene Bestellungen und alles, was gerade im Shop aktiv ist." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Umsatz gesamt" value={formatEuro(live.reduce((x, o) => x + o.amount_total, 0) / 100)} hint={`${live.length} Bestellungen`} icon={Euro} tone="green" />
        <Stat label="Heute" value={formatEuro(todays.reduce((x, o) => x + o.amount_total, 0) / 100)} hint={`${todays.length} Bestellungen`} icon={ShoppingBag} tone="accent" />
        <Stat label="Offen (zu drucken/versenden)" value={open.length} icon={Timer} tone="amber" href={`${base}/bestellungen?status=bezahlt`} />
        <Stat label="Verkaufte Teile" value={pieces} icon={Package} tone="ink" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Gerade aktiv" className="lg:col-span-1">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <BadgePercent className="mt-0.5 size-4 text-emerald-700" />
              <span>
                {preorderLive(s, now) ? (
                  <>
                    Vorbestellrabatt <strong>{s.preorder.pct} %</strong> bis {s.preorder.until || "unbegrenzt"} {s.preorder.combine ? "(mit Angeboten kombinierbar)" : "(gilt, wenn günstiger)"}
                  </>
                ) : (
                  "Kein Vorbestellrabatt aktiv"
                )}
              </span>
            </li>
            {liveOffers.map((o) => (
              <li key={o.id} className="flex items-start gap-3">
                <BadgePercent className="mt-0.5 size-4 text-emerald-700" />
                <span>{o.name.de}</span>
              </li>
            ))}
            <li className="flex items-start gap-3">
              <Truck className="mt-0.5 size-4 text-emerald-700" />
              <span>
                Standard {formatEuro(s.shipping.standardCents / 100)}
                {s.shipping.freeFromCents ? `, frei ab ${formatEuro(s.shipping.freeFromCents / 100)}` : ""}
                {s.shipping.express.enabled ? ` · Express ${formatEuro(s.shipping.express.cents / 100)}` : ""}
                {s.shipping.pickup.enabled ? " · Abholung" : ""}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Package className="mt-0.5 size-4 text-emerald-700" />
              <span>{activeProducts(store).length} von {store.products.length} Produkten sichtbar</span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`${base}/angebote`} className="adm-btn adm-btn-ghost adm-btn-sm">Angebote</Link>
            <Link href={`${base}/versand`} className="adm-btn adm-btn-ghost adm-btn-sm">Versand & Vorbestellung</Link>
            <Link href={`${base}/produkte`} className="adm-btn adm-btn-ghost adm-btn-sm">Produkte</Link>
          </div>
        </Card>
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Neueste Bestellungen</h2>
            <Link href={`${base}/bestellungen`} className="text-sm text-stone-dark hover:text-ink">Alle ansehen →</Link>
          </div>
          <OrdersList orders={orders.slice(0, 6)} action={setOrderStatus} compact />
        </div>
      </div>
    </>
  );
}
