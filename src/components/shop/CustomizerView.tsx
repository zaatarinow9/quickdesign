"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { activeVariants, isDarkHex, motifImage, printAreas, type Motif, type Product } from "@/lib/shop/schema";
import { money } from "@/lib/shop/format";
import { useShop } from "./ShopProvider";
import { GarmentPreview } from "./GarmentPreview";
import { DiscountSeal } from "./Badges";
import { ProductExtras, Stepper } from "./ProductView";
import { cn } from "@/lib/utils";

type Side = "front" | "back";
type Place = "front" | "back" | "both";

/** Selbstgestalten: Farbe → Druckseite(n) → Motiv je Seite → Größen; Vorschau live auf dem Rohling */
export function CustomizerView({
  p,
  taxNote,
  shippingLines,
  offerNames,
  prePct,
  whatsapp,
}: {
  p: Product;
  taxNote: string;
  shippingLines: string[];
  offerNames: string[];
  prePct: number;
  whatsapp: string;
}) {
  const { lang, add, store } = useShop();
  const motifs = useMemo(() => store.motifs.filter((m) => m.active), [store.motifs]);
  const variants = activeVariants(p);
  const area = printAreas[p.kind === "hoodie" ? "hoodie" : "tshirt"];

  const [colorId, setColorId] = useState(p.colors[0]?.id ?? "");
  const [place, setPlace] = useState<Place>("front");
  const [front, setFront] = useState<string>(motifs[0]?.id ?? "");
  const [back, setBack] = useState<string>(motifs[0]?.id ?? "");
  const [editing, setEditing] = useState<Side>("front");
  const [view, setView] = useState<Side>("front");
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [hint, setHint] = useState(false);
  const [added, setAdded] = useState(false);
  const [q, setQ] = useState("");

  const color = p.colors.find((c) => c.id === colorId) ?? p.colors[0];
  const dark = color ? isDarkHex(color.hex) : false;
  const byId = (id: string) => motifs.find((m) => m.id === id);
  const img = (m?: Motif) => (m ? motifImage(m, dark) : null);
  const sideOn = (s: Side) => place === "both" || place === s;
  const blank = (s: Side) => (s === "front" ? color?.blankFront || color?.image : color?.blankBack || color?.blankFront || color?.image) || "";
  const motifFor = (s: Side) => (sideOn(s) ? img(byId(s === "front" ? front : back)) : null);

  const extra = place === "both" ? p.custom.extraSideCents : 0;
  const base = variants[0]?.priceCents ?? 0;
  const pieces = Object.values(qtys).reduce((s, n) => s + n, 0);
  const sum = variants.reduce((s, v) => s + (v.priceCents + extra) * (qtys[v.id] ?? 0), 0);
  const reduce = (c: number) => Math.round((c * (100 - prePct)) / 100);
  const label = "text-sm text-[var(--muted)]";
  const L = (x: { de: string; ar: string }) => x[lang] || x.de;

  const choosePlace = (pl: Place) => {
    setPlace(pl);
    const s: Side = pl === "back" ? "back" : "front";
    setEditing(s);
    setView(s);
  };
  const pick = (id: string) => {
    if (editing === "front") setFront(id);
    else setBack(id);
    setView(editing);
  };
  const shown = motifs.filter((m) => !q.trim() || `${m.name.ar} ${m.name.de}`.toLowerCase().includes(q.trim().toLowerCase()));

  const onAdd = () => {
    const lines = variants
      .filter((v) => (qtys[v.id] ?? 0) > 0)
      .map((v) => ({ slug: p.id, color: colorId, size: v.id, qty: qtys[v.id], front: sideOn("front") ? front : undefined, back: sideOn("back") ? back : undefined }));
    if (!lines.length) {
      setHint(true);
      return;
    }
    add(lines);
    setQtys({});
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const step = (n: number, title: string, extraEl?: React.ReactNode) => (
    <p className="flex items-center gap-2.5 font-medium">
      <span className="ltr-num grid size-6 place-items-center rounded-full bg-[var(--green)] text-xs text-white">{n}</span>
      {title}
      {extraEl}
    </p>
  );
  const sideName = (s: Side) => (s === "front" ? "الأمام" : "الخلف");

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      {/* Vorschau */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative overflow-hidden rounded-2xl">
          <GarmentPreview key={`${colorId}-${view}`} blank={blank(view)} area={area[view]} motif={motifFor(view)} alt={`${L(p.name)} – ${color ? L(color.name) : ""}`} priority className="qd-fade" />
          {prePct ? (
            <span className="absolute end-4 top-4">
              <DiscountSeal pct={prePct} size="lg" label="طلب مسبق" />
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <div className="flex rounded-full bg-white/90 p-1 text-sm shadow-sm ring-1 ring-black/5 backdrop-blur">
              {(["front", "back"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setView(s)}
                  aria-pressed={view === s}
                  className={cn("rounded-full px-5 py-1.5 transition", view === s ? "bg-[var(--green)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]")}
                >
                  {sideName(s)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["front", "back"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setView(s)}
              className={cn("overflow-hidden rounded-xl text-start transition", view === s ? "ring-2 ring-[var(--ink)]" : "ring-1 ring-[var(--line)] hover:ring-[var(--muted)]")}
            >
              <GarmentPreview blank={blank(s)} area={area[s]} motif={motifFor(s)} />
              <span className="flex items-center justify-between bg-[var(--card)] px-3 py-2 text-xs">
                {sideName(s)}
                <span className={sideOn(s) ? "text-[var(--green)]" : "text-[var(--muted)]"}>{sideOn(s) ? L(byId(s === "front" ? front : back)?.name ?? { de: "", ar: "" }) : "بدون طباعة"}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Auswahl */}
      <div>
        <h1 className="text-3xl leading-tight sm:text-[2.6rem]">{L(p.name)}</h1>
        <p className="mt-2 text-[var(--muted)]">{L(p.tagline)}</p>
        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="ltr-num text-2xl font-medium">{money(prePct ? reduce(base + extra) : base + extra)}</span>
          {prePct ? <span className="ltr-num text-[var(--muted)] line-through">{money(base + extra)}</span> : null}
          <span className="text-sm text-[var(--muted)]">{taxNote}</span>
        </p>
        <p className="mt-5 leading-relaxed text-[#3d3a35]">{L(p.description)}</p>

        {/* 1 Farbe */}
        {p.colors.length ? (
          <div className="mt-8">
            {step(1, "اختر اللون", <span className="font-normal text-[var(--muted)]">– {color ? L(color.name) : ""}</span>)}
            <div className="mt-3 flex gap-3">
              {p.colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  aria-pressed={colorId === c.id}
                  aria-label={L(c.name)}
                  title={L(c.name)}
                  className={cn("size-10 rounded-full ring-offset-2 ring-offset-[var(--paper)] transition", colorId === c.id ? "ring-2 ring-[var(--ink)]" : "ring-1 ring-[var(--line)]")}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* 2 Druckseite */}
        <div className="mt-8">
          {step(2, "مكان الطباعة")}
          <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup">
            {(
              [
                ["front", "أمامي فقط", ""],
                ["back", "خلفي فقط", ""],
                ["both", "أمامي وخلفي", p.custom.extraSideCents ? `+ ${money(p.custom.extraSideCents)}` : ""],
              ] as const
            ).map(([k, t, sub]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={place === k}
                onClick={() => choosePlace(k)}
                className={cn("flex flex-col items-center gap-1.5 rounded-xl bg-[var(--card)] px-2 py-3 text-sm ring-1 transition", place === k ? "ring-2 ring-[var(--green)]" : "ring-[var(--line)] hover:ring-[var(--muted)]")}
              >
                <PlaceIcon k={k} active={place === k} />
                <span className="font-medium">{t}</span>
                {sub ? <span className="ltr-num text-xs text-[var(--gold)]">{sub}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Motiv */}
        <div className="mt-8">
          {step(3, "اختر التصميم", <span className="ltr-num font-normal text-[var(--muted)]">({motifs.length})</span>)}
          {place === "both" ? (
            <div className="mt-3 flex gap-2">
              {(["front", "back"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setEditing(s);
                    setView(s);
                  }}
                  className={cn("flex-1 rounded-full px-4 py-2 text-sm ring-1 transition", editing === s ? "bg-[var(--ink)] text-white ring-[var(--ink)]" : "ring-[var(--line)] hover:ring-[var(--muted)]")}
                >
                  تصميم {sideName(s)}
                </button>
              ))}
            </div>
          ) : null}
          {motifs.length > 12 ? (
            <label className="mt-3 flex h-10 items-center gap-2 rounded-full bg-[var(--card)] px-4 ring-1 ring-[var(--line)] focus-within:ring-[var(--green)]">
              <Search className="size-4 text-[var(--muted)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن تصميم…" className="w-full bg-transparent text-sm outline-none" />
            </label>
          ) : null}
          <div className="mt-3 grid max-h-[22rem] grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-4">
            {shown.map((m) => {
              const sel = (editing === "front" ? front : back) === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pick(m.id)}
                  aria-pressed={sel}
                  title={L(m.name)}
                  className={cn("group relative overflow-hidden rounded-xl text-center ring-1 transition", sel ? "ring-2 ring-[var(--green)]" : "ring-[var(--line)] hover:ring-[var(--muted)]")}
                >
                  <span className="grid aspect-square place-items-center p-3 transition-colors" style={{ background: color?.hex ?? "#fff" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- kleine Motiv-Kacheln */}
                    <img src={motifImage(m, dark)} alt="" loading="lazy" className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                  </span>
                  <span className="block truncate bg-[var(--card)] px-1.5 py-1.5 text-[0.7rem]">{L(m.name)}</span>
                  {sel ? (
                    <span className="absolute end-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[var(--green)] text-white">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Größen */}
        <div className="mt-8">
          {step(4, hint && pieces === 0 ? "اختر المقاس والكمية أولاً" : "المقاسات والكمية")}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((v) => {
              const n = qtys[v.id] ?? 0;
              return (
                <div key={v.id} className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2 ring-1 transition", n ? "bg-[var(--card)] ring-[var(--ink)]" : hint && !pieces ? "ring-[var(--red)]" : "ring-[var(--line)]")}>
                  <span className="ltr-num min-w-8 font-medium">{L(v.label)}</span>
                  <Stepper size="sm" value={n} max={p.maxQty} label={`الكمية ${L(v.label)}`} onChange={(x) => setQtys((qq) => ({ ...qq, [v.id]: x }))} />
                </div>
              );
            })}
          </div>
          <p className={cn(label, "mt-2 text-xs")}>يمكنك طلب عدة مقاسات بنفس التصميم دفعة واحدة.</p>
        </div>

        {/* Zusammenfassung */}
        <div className="mt-8 rounded-2xl bg-[var(--mint)]/60 p-4 text-sm">
          <p className="font-medium text-[var(--green)]">تصميمك</p>
          <ul className="mt-2 space-y-1 text-[#3d3a35]">
            <li>اللون: {color ? L(color.name) : "–"}</li>
            {sideOn("front") ? <li>الأمام: {L(byId(front)?.name ?? { de: "–", ar: "–" })}</li> : null}
            {sideOn("back") ? <li>الخلف: {L(byId(back)?.name ?? { de: "–", ar: "–" })}</li> : null}
          </ul>
        </div>

        <button type="button" onClick={onAdd} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-5 font-medium text-white transition hover:bg-[var(--green-2)]">
          {added ? <Check className="size-4" aria-hidden /> : null}
          {added ? "تمت الإضافة إلى السلة" : pieces > 0 ? `أضف ${pieces} قطع إلى السلة` : "أضف إلى السلة"}
          {pieces > 0 && !added ? <span className="ltr-num text-white/70">· {money(prePct ? reduce(sum) : sum)}</span> : null}
        </button>

        <ProductExtras p={p} shippingLines={shippingLines} offerNames={offerNames} prePct={prePct} whatsapp={whatsapp} />
      </div>
    </div>
  );
}

function PlaceIcon({ k, active }: { k: Place; active: boolean }) {
  const on = active ? "var(--green)" : "var(--muted)";
  const shirt = "M9 4l-5 3 2 4 2-1v10h8V10l2 1 2-4-5-3c-.5 1.2-1.7 2-3 2s-2.5-.8-3-2z";
  const one = (x: number, filled: boolean) => (
    <g transform={`translate(${x} 0)`}>
      <path d={shirt} fill="none" stroke={on} strokeWidth="1.3" strokeLinejoin="round" />
      {filled ? <rect x="10" y="10" width="4" height="4" rx="0.8" fill={on} /> : null}
    </g>
  );
  return (
    <svg viewBox="0 0 48 24" className="h-6 w-12" aria-hidden>
      {one(0, k !== "back")}
      {one(24, k !== "front")}
    </svg>
  );
}
