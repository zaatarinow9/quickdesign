"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Maximize2, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { activeVariants, isDarkHex, motifImage, printAreas, type Motif, type Product } from "@/lib/shop/schema";
import { money } from "@/lib/shop/format";
import { useShop } from "./ShopProvider";
import { GarmentPreview } from "./GarmentPreview";
import { DiscountSeal } from "./Badges";
import { ProductExtras, SizeQty } from "./ProductView";
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
  const [viewer, setViewer] = useState<number | null>(null);

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

  useEffect(() => {
    if (viewer === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
      if (e.key === "ArrowLeft") setViewer((v) => (v === null ? v : (v + 1) % shown.length));
      if (e.key === "ArrowRight") setViewer((v) => (v === null ? v : (v - 1 + shown.length) % shown.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, shown.length]);
  const vm = viewer !== null ? shown[viewer] : undefined;
  const assign = (s: Side, id: string) => {
    if (s === "front") setFront(id);
    else setBack(id);
    if (!sideOn(s)) setPlace("both");
    setEditing(s);
    setView(s);
  };

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
            {shown.map((m, idx) => {
              const sel = (editing === "front" ? front : back) === m.id;
              const onF = sideOn("front") && front === m.id;
              const onB = sideOn("back") && back === m.id;
              return (
                <div key={m.id} className={cn("group relative overflow-hidden rounded-xl text-center ring-1 transition", sel ? "ring-2 ring-[var(--green)]" : "ring-[var(--line)] hover:ring-[var(--muted)]")}>
                  <button type="button" onClick={() => pick(m.id)} aria-pressed={sel} title={L(m.name)} className="block w-full">
                    <span className="grid aspect-square place-items-center p-3 transition-colors" style={{ background: color?.hex ?? "#fff" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- kleine Motiv-Kacheln */}
                      <img src={motifImage(m, dark)} alt="" loading="lazy" className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                    </span>
                    <span className="block truncate bg-[var(--card)] px-1.5 py-1.5 text-[0.7rem]">{L(m.name)}</span>
                  </button>
                  <span className="pointer-events-none absolute start-1.5 top-1.5 flex gap-1">
                    {onF ? <span className="rounded-full bg-[var(--green)] px-1.5 py-0.5 text-[0.6rem] text-white">أمام</span> : null}
                    {onB ? <span className="rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[0.6rem] text-[var(--ink)]">خلف</span> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewer(idx)}
                    className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/90 text-[var(--ink)] opacity-90 shadow-sm ring-1 ring-black/5 transition hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`عرض ${L(m.name)}`}
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4 Größen */}
        <div className="mt-8">
          {step(4, hint && pieces === 0 ? "اختر المقاس والكمية أولاً" : "المقاسات والكمية")}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((v) => (
              <SizeQty key={v.id} label={L(v.label)} value={qtys[v.id] ?? 0} max={p.maxQty} invalid={hint && !pieces} onChange={(x) => setQtys((qq) => ({ ...qq, [v.id]: x }))} />
            ))}
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
      <AnimatePresence>
        {vm ? (
          <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={L(vm.name)}>
            <motion.button type="button" aria-label="إغلاق" className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewer(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[var(--paper)] shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="font-medium">{L(vm.name)}</p>
                <span className="ltr-num text-xs text-[var(--muted)]">
                  {(viewer ?? 0) + 1} / {shown.length}
                </span>
                <button type="button" onClick={() => setViewer(null)} className="grid size-9 place-items-center rounded-full hover:bg-[var(--paper-2)]" aria-label="إغلاق">
                  <X className="size-5" strokeWidth={1.6} />
                </button>
              </div>
              {/* Motiv auf hellem und dunklem Grund */}
              <div className="relative grid grid-cols-2">
                {[
                  { bg: "#f4f2ed", src: motifImage(vm, false) },
                  { bg: color && isDarkHex(color.hex) ? color.hex : "#1d1d1f", src: motifImage(vm, true) },
                ].map((x, k) => (
                  <div key={k} className="grid aspect-square place-items-center p-6" style={{ background: x.bg }}>
                    <AnimatePresence mode="wait">
                      <motion.img key={vm.id} src={x.src} alt="" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                    </AnimatePresence>
                  </div>
                ))}
                <button type="button" onClick={() => setViewer((v) => (v === null ? v : (v - 1 + shown.length) % shown.length))} className="absolute start-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow ring-1 ring-black/5 hover:bg-white" aria-label="السابق">
                  <ChevronRight className="size-5" />
                </button>
                <button type="button" onClick={() => setViewer((v) => (v === null ? v : (v + 1) % shown.length))} className="absolute end-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow ring-1 ring-black/5 hover:bg-white" aria-label="التالي">
                  <ChevronLeft className="size-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4">
                {(["front", "back"] as const).map((sd) => {
                  const on = sideOn(sd) && (sd === "front" ? front : back) === vm.id;
                  return (
                    <button
                      key={sd}
                      type="button"
                      onClick={() => {
                        assign(sd, vm.id);
                        setViewer(null);
                      }}
                      className={cn("flex h-12 items-center justify-center gap-2 rounded-full font-medium transition", on ? "bg-[var(--mint)] text-[var(--green)]" : sd === "front" ? "bg-[var(--green)] text-white hover:bg-[var(--green-2)]" : "bg-[var(--ink)] text-white hover:opacity-90")}
                    >
                      {on ? <Check className="size-4" /> : null}
                      {sd === "front" ? "على الأمام" : "على الخلف"}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
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
