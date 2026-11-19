"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus } from "lucide-react";
import { activeVariants, detailOf, imageOf, type Product } from "@/lib/shop/schema";
import { money } from "@/lib/shop/format";
import { fill } from "@/lib/shop/i18n";
import { useShop } from "./ShopProvider";
import { cn } from "@/lib/utils";

function Stepper({ value, onChange, max, label, size = "md" }: { value: number; onChange: (n: number) => void; max: number; label: string; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-9" : "h-12";
  const w = size === "sm" ? "w-9" : "w-12";
  return (
    <div className={cn("flex items-center rounded-full bg-[var(--card)] ring-1 ring-[var(--line)]", h)}>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className={cn("grid place-items-center text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30", h, w)} disabled={value <= 0} aria-label={`${label} −`}>
        <Minus className="size-3.5" />
      </button>
      <input
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value.replace(/\D/g, "")) || 0)))}
        inputMode="numeric"
        aria-label={label}
        className="ltr-num w-8 bg-transparent text-center text-[0.95rem] outline-none"
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className={cn("grid place-items-center text-[var(--muted)] hover:text-[var(--ink)]", h, w)} aria-label={`${label} +`}>
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function ProductView({
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
  const { t, lang, add } = useShop();
  const textile = p.category === "textil";
  const variants = activeVariants(p);
  const [colorId, setColorId] = useState(p.colors[0]?.id ?? "");
  const [variantId, setVariantId] = useState(variants[0].id);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [qty, setQty] = useState(1);
  const [hint, setHint] = useState(false);
  const [added, setAdded] = useState(false);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const color = p.colors.find((c) => c.id === colorId);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const images = useMemo(() => {
    const list = [imageOf(p, colorId, textile ? undefined : variantId), detailOf(p, colorId), ...p.gallery].filter(Boolean);
    return [...new Set(list)];
  }, [p, colorId, variantId, textile]);
  const shown = images[Math.min(active, images.length - 1)] ?? "";

  const totalPieces = textile ? Object.values(qtys).reduce((s, n) => s + n, 0) : qty;
  const unit = textile ? variants[0].priceCents : variant.priceCents;
  const sumCents = textile ? variants.reduce((s, v) => s + v.priceCents * (qtys[v.id] ?? 0), 0) : variant.priceCents * qty;
  const reduce = (c: number) => Math.round((c * (100 - prePct)) / 100);

  const onAdd = () => {
    if (textile) {
      const lines = variants.filter((v) => (qtys[v.id] ?? 0) > 0).map((v) => ({ slug: p.id, color: colorId, size: v.id, qty: qtys[v.id] }));
      if (!lines.length) {
        setHint(true);
        return;
      }
      add(lines);
      setQtys({});
    } else {
      add({ slug: p.id, color: colorId, size: variant.id, qty });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const label = "text-sm text-[var(--muted)]";

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      {/* Galerie */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div
          className={cn("relative aspect-square overflow-hidden rounded-2xl bg-[var(--paper-2)]", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
          onMouseMove={(e) => {
            if (window.matchMedia("(hover: none)").matches) return;
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={(e) => {
            if (!window.matchMedia("(hover: none)").matches) return;
            const r = e.currentTarget.getBoundingClientRect();
            setZoom((z) => (z ? null : { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }));
          }}
        >
          {shown ? (
            <Image
              key={shown}
              src={shown}
              alt={`${p.name[lang]}${color ? ` – ${color.name[lang]}` : ""}`}
              fill
              priority
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-cover transition-transform duration-300 ease-out"
              style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          ) : null}
          {prePct ? <span className="ltr-num absolute start-4 top-4 rounded-full bg-[var(--green)] px-3 py-1 text-xs font-medium text-white">−{prePct} %</span> : null}
          <span className="pointer-events-none absolute bottom-3 end-3 hidden rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--muted)] backdrop-blur sm:block">{t.product.zoom}</span>
        </div>
        {images.length > 1 ? (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                className={cn("relative size-20 shrink-0 overflow-hidden rounded-xl bg-[var(--paper-2)] transition", active === i ? "ring-2 ring-[var(--ink)]" : "ring-1 ring-[var(--line)] hover:ring-[var(--muted)]")}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Angaben */}
      <div>
        <h1 className="text-3xl leading-tight sm:text-[2.6rem]">{p.name[lang]}</h1>
        <p className="mt-2 text-[var(--muted)]">{p.tagline[lang]}</p>
        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="ltr-num text-2xl font-medium">{money(prePct ? reduce(unit) : unit)}</span>
          {prePct ? <span className="ltr-num text-[var(--muted)] line-through">{money(unit)}</span> : null}
          <span className="text-sm text-[var(--muted)]">{taxNote}</span>
        </p>
        {prePct ? <p className="mt-1 text-sm text-[var(--green)]">{t.preorder.price}</p> : null}
        <p className="mt-6 leading-relaxed text-[#3d3a35]">{p.description[lang]}</p>

        {/* Farbe */}
        {p.colors.length ? (
          <div className="mt-8">
            <p className={label}>
              {t.product.color}: <span className="text-[var(--ink)]">{color?.name[lang]}</span>
            </p>
            <div className="mt-3 flex gap-3">
              {p.colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setColorId(c.id);
                    setActive(0);
                  }}
                  aria-pressed={colorId === c.id}
                  aria-label={c.name[lang]}
                  className={cn("size-9 rounded-full ring-offset-2 ring-offset-[var(--paper)] transition", colorId === c.id ? "ring-2 ring-[var(--ink)]" : "ring-1 ring-[var(--line)]")}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Größen mit Anzahl / Formate */}
        <div className="mt-8">
          <p className={cn(label, hint && totalPieces === 0 && "text-[var(--red)]")}>{hint && totalPieces === 0 ? t.product.chooseSize : textile ? t.product.sizes : t.product.format}</p>
          {textile ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {variants.map((v) => {
                  const n = qtys[v.id] ?? 0;
                  return (
                    <div key={v.id} className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2 ring-1 transition", n ? "bg-[var(--card)] ring-[var(--ink)]" : "ring-[var(--line)]")}>
                      <span className="ltr-num min-w-8 font-medium">{v.label[lang]}</span>
                      <Stepper size="sm" value={n} max={p.maxQty} label={`${t.product.qty} ${v.label[lang]}`} onChange={(x) => setQtys((q) => ({ ...q, [v.id]: x }))} />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{t.product.sizesHint}</p>
            </>
          ) : (
            <div className="mt-3 space-y-2" role="radiogroup">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={variantId === v.id}
                  onClick={() => {
                    setVariantId(v.id);
                    setActive(0);
                  }}
                  className={cn("flex w-full items-center gap-4 rounded-xl bg-[var(--card)] p-2.5 pe-4 text-start ring-1 transition", variantId === v.id ? "ring-2 ring-[var(--ink)]" : "ring-[var(--line)] hover:ring-[var(--muted)]")}
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[var(--paper-2)]">
                    {(v.image || imageOf(p)) ? <Image src={v.image || imageOf(p)} alt="" fill sizes="56px" className="object-cover" /> : null}
                  </span>
                  <span className="flex-1">{v.label[lang]}</span>
                  <span className="ltr-num shrink-0 text-[var(--muted)]">{money(prePct ? reduce(v.priceCents) : v.priceCents)}</span>
                </button>
              ))}
            </div>
          )}
          {p.sizeChart.length ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer list-none text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]">{t.product.sizeChart}</summary>
              <div className="mt-3 overflow-x-auto rounded-xl bg-[var(--card)] ring-1 ring-[var(--line)]">
                <table className="w-full text-center">
                  <thead className="text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 font-normal">{t.product.chart.size}</th>
                      <th className="px-3 py-2 font-normal">{t.product.chart.width}</th>
                      <th className="px-3 py-2 font-normal">{t.product.chart.length}</th>
                      {p.sizeChart.some((r) => r.sleeve) ? <th className="px-3 py-2 font-normal">{t.product.chart.sleeve}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="ltr-num">
                    {p.sizeChart.map((r) => (
                      <tr key={r.size} className="border-t border-[var(--line)]">
                        <td className="px-3 py-2">{r.size}</td>
                        <td className="px-3 py-2">{r.width}</td>
                        <td className="px-3 py-2">{r.length}</td>
                        {p.sizeChart.some((x) => x.sleeve) ? <td className="px-3 py-2">{r.sleeve ?? "–"}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">{t.product.chart.note}</p>
              </div>
            </details>
          ) : null}
        </div>

        {/* Hinzufügen */}
        <div className="mt-8 flex gap-3">
          {!textile ? <Stepper value={qty} max={p.maxQty} label={t.product.qty} onChange={(n) => setQty(Math.max(1, n))} /> : null}
          <button type="button" onClick={onAdd} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--green)] px-5 font-medium text-white transition hover:bg-[var(--green-2)]">
            {added ? <Check className="size-4" aria-hidden /> : null}
            {added ? t.product.added : textile && totalPieces > 0 ? fill(t.product.addN, { n: totalPieces }) : t.product.add}
            {totalPieces > 0 && !added ? <span className="ltr-num text-white/70">· {money(prePct ? reduce(sumCents) : sumCents)}</span> : null}
          </button>
        </div>

        {/* Angebote */}
        {offerNames.length || prePct ? (
          <div className="mt-6 space-y-2 rounded-xl border border-[var(--line)] p-4 text-sm">
            <p className="font-medium">{t.product.offers}</p>
            <ul className="space-y-1.5 text-[#3d3a35]">
              {prePct ? <li>{fill(t.preorder.badge, { pct: prePct })}</li> : null}
              {offerNames.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--green)]" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`${t.product.whatsappMsg} (${p.name[lang]})`)}`}
          target="_blank"
          rel="noopener"
          className="mt-4 block text-sm text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]"
        >
          {t.product.special}
        </a>

        {/* Details */}
        <div className="mt-8 border-t border-[var(--line)] pt-6 text-sm">
          {p.details.length ? (
            <>
              <p className="font-medium">{t.product.details}</p>
              <ul className="mt-3 space-y-1.5 text-[var(--muted)]">
                {p.details.map((d, i) => (
                  <li key={i}>{d[lang]}</li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="mt-6 font-medium">{t.product.shipping}</p>
          <ul className="mt-2 space-y-1 text-[var(--muted)]">
            {shippingLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
