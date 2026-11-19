"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, Plus, Ruler, ShoppingBag, Truck } from "lucide-react";
import type { Product } from "@/lib/shop/catalog";
import { money } from "@/lib/shop/format";
import { Artwork } from "./Artwork";
import { Mockup } from "./Mockup";
import { useShop } from "./ShopProvider";
import { cn } from "@/lib/utils";

export function ProductView({ p, taxNote, shippingNote }: { p: Product; taxNote: string; shippingNote: string }) {
  const { t, lang, add } = useShop();
  const [colorId, setColorId] = useState(p.colors[0].id);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<"shirt" | "motiv">("shirt");
  const [chart, setChart] = useState(false);
  const [hint, setHint] = useState(false);
  const [added, setAdded] = useState(false);
  const color = p.colors.find((c) => c.id === colorId)!;

  const onAdd = () => {
    if (!size) {
      setHint(true);
      return;
    }
    add({ slug: p.slug, color: color.id, size, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      {/* Bilder */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-[5/5.6] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.10),transparent_65%),linear-gradient(180deg,#141816,#0b0d0c)] ring-1 ring-white/10">
          <AnimatePresence mode="wait">
            <motion.div key={`${view}-${color.id}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="absolute inset-0 p-6 sm:p-10">
              {view === "shirt" ? (
                <Mockup garment={p.garment} art={p.artwork} color={color.hex} tone={color.ink} label={`${p.name[lang]} – ${color.name[lang]}`} className="h-full w-full" />
              ) : (
                <div className="grid h-full place-items-center rounded-3xl" style={{ background: color.hex }}>
                  <Artwork art={p.artwork} tone={color.ink} className="w-[78%] [&_svg]:h-auto [&_svg]:w-full" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-3 flex gap-3">
          {(["shirt", "motiv"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn("h-20 w-20 overflow-hidden rounded-2xl p-1.5 ring-1 transition", view === v ? "bg-white/10 ring-[var(--shop-gold)]" : "bg-white/[0.04] ring-white/10 hover:ring-white/30")}
              aria-label={v === "shirt" ? p.name[lang] : "Motiv"}
            >
              {v === "shirt" ? (
                <Mockup garment={p.garment} art={p.artwork} color={color.hex} tone={color.ink} className="h-full w-full" />
              ) : (
                <div className="grid h-full place-items-center rounded-xl" style={{ background: color.hex }}>
                  <Artwork art={p.artwork} tone={color.ink} className="w-[80%] [&_svg]:h-auto [&_svg]:w-full" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Angaben */}
      <div>
        {p.badge ? <span className="inline-block rounded-full bg-[var(--shop-gold-2)] px-3 py-1 text-xs font-semibold text-[#1a140a]">{p.badge[lang]}</span> : null}
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{p.name[lang]}</h1>
        <p className="mt-2 text-lg text-white/60">{p.tagline[lang]}</p>
        <p className="mt-6 flex items-baseline gap-3">
          <span className="ltr-num text-3xl font-semibold text-[var(--shop-gold-2)]">{money(p.priceCents)}</span>
          <span className="text-sm text-white/50">{taxNote}</span>
        </p>
        <p className="mt-6 max-w-xl leading-relaxed text-white/75">{p.description[lang]}</p>

        {/* Farbe */}
        <div className="mt-8">
          <p className="mb-3 text-sm text-white/60">
            {t.product.color}: <span className="font-semibold text-white">{color.name[lang]}</span>
          </p>
          <div className="flex gap-3">
            {p.colors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorId(c.id)}
                aria-pressed={c.id === colorId}
                aria-label={c.name[lang]}
                className={cn("grid size-11 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-[#0a0c0b] transition", c.id === colorId ? "ring-[var(--shop-gold)]" : "ring-transparent hover:ring-white/30")}
              >
                <span className="size-9 rounded-full ring-1 ring-white/25" style={{ background: c.hex }} />
              </button>
            ))}
          </div>
        </div>

        {/* Größe */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className={cn("text-sm", hint && !size ? "text-red-300" : "text-white/60")}>{hint && !size ? t.product.chooseSize : t.product.size}</p>
            <button type="button" onClick={() => setChart((v) => !v)} className="inline-flex items-center gap-1.5 text-sm text-[var(--shop-gold-2)] hover:underline" aria-expanded={chart}>
              <Ruler className="size-4" aria-hidden /> {t.product.sizeChart}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSize(s);
                  setHint(false);
                }}
                aria-pressed={size === s}
                className={cn("ltr-num h-12 min-w-14 rounded-xl px-4 text-sm font-semibold ring-1 transition", size === s ? "bg-white text-[#0a0c0b] ring-white" : "ring-white/20 hover:ring-white/50", hint && !size && "ring-red-400/60")}
              >
                {s}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {chart ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 overflow-x-auto rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                  <table className="w-full text-sm">
                    <thead className="text-white/60">
                      <tr>
                        <th className="px-4 py-2.5 text-start font-medium">{t.product.chart.size}</th>
                        <th className="px-4 py-2.5 text-start font-medium">{t.product.chart.width}</th>
                        <th className="px-4 py-2.5 text-start font-medium">{t.product.chart.length}</th>
                        {p.sizeChart[0]?.sleeve ? <th className="px-4 py-2.5 text-start font-medium">{t.product.chart.sleeve}</th> : null}
                      </tr>
                    </thead>
                    <tbody className="ltr-num">
                      {p.sizeChart.map((r) => (
                        <tr key={r.size} className={cn("border-t border-white/10", size === r.size && "bg-white/[0.06]")}>
                          <td className="px-4 py-2 font-semibold">{r.size}</td>
                          <td className="px-4 py-2">{r.width}</td>
                          <td className="px-4 py-2">{r.length}</td>
                          {r.sleeve ? <td className="px-4 py-2">{r.sleeve}</td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="border-t border-white/10 px-4 py-2 text-xs text-white/50">{t.product.chart.note}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Anzahl + Warenkorb */}
        <div className="mt-8 flex flex-wrap items-stretch gap-3">
          <div className="flex items-center rounded-full ring-1 ring-white/20" aria-label={t.product.qty}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-12 place-items-center rounded-full hover:bg-white/10" aria-label="−">
              <Minus className="size-4" />
            </button>
            <span className="ltr-num w-8 text-center font-semibold">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} className="grid size-12 place-items-center rounded-full hover:bg-white/10" aria-label="+">
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="flex min-w-56 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d8b25e] to-[#ecd08a] px-6 py-3.5 font-semibold text-[#14110a] shadow-[0_12px_40px_-12px_rgba(216,178,94,0.7)] transition hover:brightness-105"
          >
            {added ? <Check className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
            {added ? t.product.added : t.product.add}
          </button>
        </div>
        <p className="mt-3 text-sm text-white/50">{t.product.printNote}</p>

        <div className="mt-10 divide-y divide-white/10 rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
          <details className="group p-5" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              {t.product.material} <span className="text-white/40 group-open:rotate-45 transition">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{p.material[lang]}</p>
          </details>
          <details className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              <span className="flex items-center gap-2">
                <Truck className="size-4 text-[var(--shop-gold-2)]" aria-hidden /> {t.product.shipping}
              </span>
              <span className="text-white/40 group-open:rotate-45 transition">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{shippingNote}</p>
          </details>
        </div>
      </div>
    </div>
  );
}
