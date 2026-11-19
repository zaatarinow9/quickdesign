"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveOffers } from "@/app/shop-admin/actions";
import { inScope, type Offer, type Product } from "@/lib/shop/schema";
import { Badge, Card } from "@/components/admin/ui";
import { LField, MoneyInput, NumberInput, SaveBar, Toggle } from "./fields";

const eur = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

const templates: { label: string; make: () => Offer }[] = [
  {
    label: "3 für Festpreis",
    make: () => ({
      id: `paket-${Date.now().toString(36)}`,
      active: true,
      name: { de: "3 T-Shirts für 75 €", ar: "3 تيشرتات بـ ⁦75 €⁩" },
      badge: { de: "3 für 75 €", ar: "3 بـ ⁦75 €⁩" },
      scope: { type: "category", category: "textil", products: [] },
      starts: "",
      ends: "",
      kind: "bundle",
      bundle: { qty: 3, mode: "price", value: 7500 },
    }),
  },
  {
    label: "2 + 1 (drittes günstiger)",
    make: () => ({
      id: `zwei-plus-eins-${Date.now().toString(36)}`,
      active: true,
      name: { de: "2 + 1: das dritte 50 % günstiger", ar: "⁦2 + 1⁩: الثالثة أرخص بـ ⁦50%⁩" },
      badge: { de: "2 + 1", ar: "⁦2 + 1⁩" },
      scope: { type: "category", category: "textil", products: [] },
      starts: "",
      ends: "",
      kind: "bundle",
      bundle: { qty: 3, mode: "cheapest", value: 50 },
    }),
  },
  {
    label: "Mengenrabatt",
    make: () => ({
      id: `menge-${Date.now().toString(36)}`,
      active: true,
      name: { de: "Mengenrabatt", ar: "خصم كميات" },
      badge: { de: "ab 10 Stück −10 %", ar: "من 10 قطع ⁦−10%⁩" },
      scope: { type: "category", category: "druck", products: [] },
      starts: "",
      ends: "",
      kind: "tiers",
      tiers: [
        { min: 10, pct: 10 },
        { min: 25, pct: 20 },
      ],
    }),
  },
  {
    label: "Aktion −%",
    make: () => ({
      id: `aktion-${Date.now().toString(36)}`,
      active: true,
      name: { de: "Wochenend-Aktion −15 %", ar: "عرض نهاية الأسبوع ⁦−15%⁩" },
      badge: { de: "−15 %", ar: "⁦−15%⁩" },
      scope: { type: "all", products: [] },
      starts: "",
      ends: "",
      kind: "percent",
      percent: 15,
    }),
  },
];

function example(o: Offer, products: Product[]): string {
  const p = products.find((x) => inScope(o.scope, x));
  if (!p) return "Kein Produkt im Geltungsbereich.";
  const price = Math.min(...p.variants.filter((v) => v.active).map((v) => v.priceCents));
  if (o.kind === "bundle" && o.bundle) {
    const n = o.bundle.qty;
    const sum = price * n;
    const pay = o.bundle.mode === "price" ? Math.min(sum, o.bundle.value) : o.bundle.mode === "cheapest" ? sum - Math.round((price * o.bundle.value) / 100) : Math.round((sum * (100 - o.bundle.value)) / 100);
    return `Beispiel: ${n} × „${p.name.de}“ (${eur(price)}) = ${eur(sum)} → Kunde zahlt ${eur(pay)} (spart ${eur(sum - pay)}).`;
  }
  if (o.kind === "tiers" && o.tiers?.length) {
    const t = o.tiers[o.tiers.length - 1];
    return `Beispiel: ${t.min} × „${p.name.de}“ (${eur(price)}) → je ${eur(Math.round((price * (100 - t.pct)) / 100))} statt ${eur(price)}.`;
  }
  if (o.kind === "percent") return `Beispiel: „${p.name.de}“ ${eur(price)} → ${eur(Math.round((price * (100 - (o.percent ?? 0))) / 100))}.`;
  return "";
}

export function OffersEditor({ initial, products }: { initial: Offer[]; products: Product[] }) {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>(initial);
  const [dirty, setDirty] = useState(false);
  const set = (next: Offer[]) => {
    setOffers(next);
    setDirty(true);
  };
  const upd = (i: number, patch: Partial<Offer>) => set(offers.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const productList = useMemo(() => products.map((p) => ({ id: p.id, name: p.name.de, category: p.category })), [products]);

  return (
    <div className="space-y-5">
      <Card title="Neues Angebot aus Vorlage">
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button key={t.label} type="button" className="adm-btn adm-btn-ghost" onClick={() => set([...offers, t.make()])}>
              <Plus className="size-4" /> {t.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-dark">
          Reihenfolge der Berechnung: zuerst Mengenrabatte und Prozent-Aktionen (pro Stück, der beste zählt), dann Pakete in der Reihenfolge dieser Liste. Ein Teil zählt nur für ein Paket. Der Vorbestellrabatt wird unter „Versand, Express & Vorbestellung“ eingestellt.
        </p>
      </Card>

      {offers.map((o, i) => (
        <Card
          key={i}
          title={
            <span className="flex items-center gap-2">
              {o.name.de || "Neues Angebot"}
              <Badge tone={o.active ? "green" : "gray"}>{o.active ? "aktiv" : "pausiert"}</Badge>
            </span>
          }
          action={
            <div className="flex items-center gap-1">
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={i === 0} onClick={() => { const n = [...offers]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set(n); }}><ArrowUp className="size-3.5" /></button>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={i === offers.length - 1} onClick={() => { const n = [...offers]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; set(n); }}><ArrowDown className="size-3.5" /></button>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => confirm("Angebot löschen?") && set(offers.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-8">
              <Toggle checked={o.active} onChange={(active) => upd(i, { active })} label="Aktiv" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-stone-dark">Von</span>
                <input type="date" className="adm-input" value={o.starts} onChange={(e) => upd(i, { starts: e.target.value })} />
                <span className="text-stone-dark">bis</span>
                <input type="date" className="adm-input" value={o.ends} onChange={(e) => upd(i, { ends: e.target.value })} />
                <span className="text-xs text-stone-dark">(leer = unbegrenzt)</span>
              </div>
            </div>
            <LField label="Name (im Warenkorb und auf der Startseite)" value={o.name} onChange={(name) => upd(i, { name })} />
            <LField label="Kurz-Hinweis am Produkt (Badge)" value={o.badge} onChange={(badge) => upd(i, { badge })} />

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="adm-label">Art des Angebots</p>
                <select
                  className="adm-input w-full"
                  value={o.kind}
                  onChange={(e) => {
                    const kind = e.target.value as Offer["kind"];
                    upd(i, {
                      kind,
                      bundle: kind === "bundle" ? (o.bundle ?? { qty: 3, mode: "price", value: 7500 }) : o.bundle,
                      tiers: kind === "tiers" ? (o.tiers?.length ? o.tiers : [{ min: 10, pct: 10 }]) : o.tiers,
                      percent: kind === "percent" ? (o.percent ?? 10) : o.percent,
                    });
                  }}
                >
                  <option value="bundle">Paket (z. B. 3 für 75 €, 2 + 1)</option>
                  <option value="tiers">Mengenrabatt (ab X Stück −Y %)</option>
                  <option value="percent">Prozent-Aktion (−X % auf alles im Bereich)</option>
                </select>

                {o.kind === "bundle" && o.bundle ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink/[0.03] p-3 text-sm">
                    <span>Je</span>
                    <NumberInput className="w-20" value={o.bundle.qty} min={2} max={50} onChange={(qty) => upd(i, { bundle: { ...o.bundle!, qty } })} />
                    <span>Teile</span>
                    <select className="adm-input" value={o.bundle.mode} onChange={(e) => upd(i, { bundle: { ...o.bundle!, mode: e.target.value as "price", value: e.target.value === "price" ? 7500 : 50 } })}>
                      <option value="price">zusammen für</option>
                      <option value="cheapest">das günstigste um</option>
                      <option value="percent">alle um</option>
                    </select>
                    {o.bundle.mode === "price" ? (
                      <MoneyInput className="w-32" cents={o.bundle.value} onChange={(value) => upd(i, { bundle: { ...o.bundle!, value } })} />
                    ) : (
                      <>
                        <NumberInput className="w-24" value={o.bundle.value} max={100} suffix="%" onChange={(value) => upd(i, { bundle: { ...o.bundle!, value } })} />
                        <span>günstiger</span>
                      </>
                    )}
                  </div>
                ) : null}

                {o.kind === "tiers" ? (
                  <div className="mt-3 space-y-2 rounded-xl bg-ink/[0.03] p-3 text-sm">
                    {(o.tiers ?? []).map((t, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <span>ab</span>
                        <NumberInput className="w-24" value={t.min} min={2} max={10000} onChange={(min) => upd(i, { tiers: o.tiers!.map((x, j) => (j === k ? { ...x, min } : x)) })} />
                        <span>Stück</span>
                        <NumberInput className="w-24" value={t.pct} max={100} suffix="%" onChange={(pct) => upd(i, { tiers: o.tiers!.map((x, j) => (j === k ? { ...x, pct } : x)) })} />
                        <span>Rabatt</span>
                        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => upd(i, { tiers: o.tiers!.filter((_, j) => j !== k) })}><Trash2 className="size-3.5" /></button>
                      </div>
                    ))}
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => upd(i, { tiers: [...(o.tiers ?? []), { min: ((o.tiers ?? []).at(-1)?.min ?? 5) * 2, pct: ((o.tiers ?? []).at(-1)?.pct ?? 5) + 5 }] })}>
                      <Plus className="size-3.5" /> Stufe
                    </button>
                    <p className="text-xs text-stone-dark">Zählt die Gesamtmenge je Produkt (alle Größen/Formate zusammen).</p>
                  </div>
                ) : null}

                {o.kind === "percent" ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink/[0.03] p-3 text-sm">
                    <NumberInput className="w-24" value={o.percent ?? 0} max={100} suffix="%" onChange={(percent) => upd(i, { percent })} />
                    <span>Rabatt auf jeden Artikel im Bereich</span>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="adm-label">Gilt für</p>
                <select
                  className="adm-input w-full"
                  value={o.scope.type === "category" ? `cat:${o.scope.category}` : o.scope.type}
                  onChange={(e) => {
                    const v = e.target.value;
                    upd(i, { scope: v.startsWith("cat:") ? { type: "category", category: v.slice(4) as "textil", products: [] } : { type: v as "all", products: o.scope.products } });
                  }}
                >
                  <option value="all">Alle Produkte</option>
                  <option value="cat:textil">Alle Textilien</option>
                  <option value="cat:druck">Alle Druckprodukte</option>
                  <option value="products">Ausgewählte Produkte …</option>
                </select>
                {o.scope.type === "products" ? (
                  <div className="mt-3 grid max-h-56 gap-1 overflow-y-auto rounded-xl bg-ink/[0.03] p-3 text-sm sm:grid-cols-2">
                    {productList.map((p) => (
                      <label key={p.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={o.scope.products.includes(p.id)}
                          onChange={(e) => upd(i, { scope: { ...o.scope, products: e.target.checked ? [...o.scope.products, p.id] : o.scope.products.filter((x) => x !== p.id) } })}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{example(o, products)}</p>
          </div>
        </Card>
      ))}

      {!offers.length ? <p className="text-sm text-stone-dark">Keine Angebote – wählen Sie oben eine Vorlage.</p> : null}

      <SaveBar
        dirty={dirty}
        onSave={async () => {
          const r = await saveOffers(offers);
          if (r.ok) {
            setDirty(false);
            router.refresh();
          }
          return r;
        }}
      />
    </div>
  );
}
