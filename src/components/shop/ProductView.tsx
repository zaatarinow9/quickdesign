"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus } from "lucide-react";
import { imageOf, type Product } from "@/lib/shop/catalog";
import { offers, whatsappNumber } from "@/lib/shop/config";
import { money } from "@/lib/shop/format";
import { fill } from "@/lib/shop/i18n";
import { useShop } from "./ShopProvider";
import { cn } from "@/lib/utils";

export function ProductView({ p, taxNote, shippingNote }: { p: Product; taxNote: string; shippingNote: string }) {
  const { t, lang, add } = useShop();
  const textile = p.category === "textil";
  const [colorId, setColorId] = useState(p.colors[0]?.color.id ?? "");
  const [variantId, setVariantId] = useState<string | null>(textile ? null : p.variants[0].id);
  const [qty, setQty] = useState(1);
  const [hint, setHint] = useState(false);
  const [added, setAdded] = useState(false);
  const variant = p.variants.find((v) => v.id === variantId);
  const color = p.colors.find((c) => c.color.id === colorId)?.color;
  const maxQty = textile ? 50 : 500;

  const onAdd = () => {
    if (!variantId) {
      setHint(true);
      return;
    }
    add({ slug: p.slug, color: colorId, size: variantId, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const label = "text-sm text-[var(--muted)]";

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      {/* Bild */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--paper-2)]">
          <Image
            key={imageOf(p, colorId)}
            src={imageOf(p, colorId)}
            alt={`${p.name[lang]}${color ? ` – ${color.name[lang]}` : ""}`}
            fill
            priority
            sizes="(min-width: 1024px) 600px, 100vw"
            className="object-cover"
          />
        </div>
        {p.colors.length > 1 ? (
          <div className="mt-3 flex gap-3">
            {p.colors.map(({ color: c, image }) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorId(c.id)}
                aria-pressed={colorId === c.id}
                aria-label={c.name[lang]}
                className={cn("relative size-20 overflow-hidden rounded-xl bg-[var(--paper-2)] ring-1 transition", colorId === c.id ? "ring-2 ring-[var(--ink)]" : "ring-[var(--line)] hover:ring-[var(--muted)]")}
              >
                <Image src={image} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Angaben */}
      <div>
        <h1 className="text-3xl leading-tight sm:text-4xl">{p.name[lang]}</h1>
        <p className="mt-2 text-[var(--muted)]">{p.tagline[lang]}</p>
        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-medium">
            {!variant && !textile ? `${t.card.from} ` : ""}
            <span className="ltr-num">{money(variant?.priceCents ?? p.variants[0].priceCents)}</span>
          </span>
          <span className="text-sm text-[var(--muted)]">{taxNote}</span>
        </p>
        <p className="mt-6 leading-relaxed text-[#3d3a35]">{p.description[lang]}</p>

        {/* Farbe */}
        {p.colors.length ? (
          <div className="mt-8">
            <p className={label}>
              {t.product.color}: <span className="text-[var(--ink)]">{color?.name[lang]}</span>
            </p>
            <div className="mt-3 flex gap-3">
              {p.colors.map(({ color: c }) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  aria-pressed={colorId === c.id}
                  aria-label={c.name[lang]}
                  className={cn("size-9 rounded-full ring-offset-2 ring-offset-[var(--paper)] transition", colorId === c.id ? "ring-2 ring-[var(--ink)]" : "ring-1 ring-[var(--line)]")}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Größe / Format */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <p className={cn(label, hint && !variantId && "text-[var(--red)]")}>{hint && !variantId ? t.product.chooseSize : textile ? t.product.size : t.product.format}</p>
          </div>
          {textile ? (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVariantId(v.id);
                    setHint(false);
                  }}
                  aria-pressed={variantId === v.id}
                  className={cn(
                    "ltr-num h-11 rounded-lg text-sm transition",
                    variantId === v.id ? "bg-[var(--ink)] text-white" : "bg-[var(--card)] ring-1 ring-[var(--line)] hover:ring-[var(--muted)]",
                  )}
                >
                  {v.label[lang]}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 space-y-2" role="radiogroup">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={variantId === v.id}
                  onClick={() => setVariantId(v.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-xl bg-[var(--card)] px-4 py-3.5 text-start ring-1 transition",
                    variantId === v.id ? "ring-2 ring-[var(--ink)]" : "ring-[var(--line)] hover:ring-[var(--muted)]",
                  )}
                >
                  <span>{v.label[lang]}</span>
                  <span className="ltr-num shrink-0 text-[var(--muted)]">{money(v.priceCents)}</span>
                </button>
              ))}
            </div>
          )}
          {p.sizeChart ? (
            <details className="group mt-3 text-sm">
              <summary className="cursor-pointer list-none text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]">{t.product.sizeChart}</summary>
              <div className="mt-3 overflow-x-auto rounded-xl bg-[var(--card)] ring-1 ring-[var(--line)]">
                <table className="w-full text-center">
                  <thead className="text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 font-normal">{t.product.chart.size}</th>
                      <th className="px-3 py-2 font-normal">{t.product.chart.width}</th>
                      <th className="px-3 py-2 font-normal">{t.product.chart.length}</th>
                      {p.sizeChart[0].sleeve ? <th className="px-3 py-2 font-normal">{t.product.chart.sleeve}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="ltr-num">
                    {p.sizeChart.map((r) => (
                      <tr key={r.size} className="border-t border-[var(--line)]">
                        <td className="px-3 py-2">{r.size}</td>
                        <td className="px-3 py-2">{r.width}</td>
                        <td className="px-3 py-2">{r.length}</td>
                        {r.sleeve ? <td className="px-3 py-2">{r.sleeve}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">{t.product.chart.note}</p>
              </div>
            </details>
          ) : null}
        </div>

        {/* Menge + Button */}
        <div className="mt-8 flex gap-3">
          <div className="flex h-12 items-center rounded-full bg-[var(--card)] ring-1 ring-[var(--line)]">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-12 place-items-center text-[var(--muted)] hover:text-[var(--ink)]" aria-label="−">
              <Minus className="size-4" />
            </button>
            <input
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value.replace(/\D/g, "")) || 1)))}
              inputMode="numeric"
              aria-label={t.product.qty}
              className="ltr-num w-10 bg-transparent text-center outline-none"
            />
            <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="grid size-12 place-items-center text-[var(--muted)] hover:text-[var(--ink)]" aria-label="+">
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--ink)] font-medium text-white transition hover:bg-black"
          >
            {added ? <Check className="size-4" aria-hidden /> : null}
            {added ? t.product.added : t.product.add}
          </button>
        </div>

        {/* Angebot */}
        <div className="mt-6 rounded-xl border border-[var(--line)] px-4 py-3.5 text-sm leading-relaxed">
          {textile ? (
            <p>
              <span className="ltr-num me-2 inline-block rounded bg-[var(--green)] px-1.5 py-0.5 text-xs font-medium text-white">2 + 1</span>
              {fill(t.product.bundle, { pct: offers.bundle.pct })}
            </p>
          ) : (
            <>
              {p.tiers?.length ? (
                <p>
                  <span className="font-medium">{t.product.tiers}:</span>{" "}
                  {p.tiers.map((tier) => fill(t.product.tierRow, { min: tier.min, pct: tier.pct })).join(" · ")}
                </p>
              ) : null}
              <p className={p.tiers?.length ? "mt-1.5 text-[var(--muted)]" : "text-[var(--muted)]"}>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`${t.groups.message} (${p.name[lang]})`)}`}
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-4 hover:text-[var(--ink)]"
                >
                  {t.product.custom}
                </a>
              </p>
            </>
          )}
        </div>

        {/* Details */}
        <div className="mt-8 border-t border-[var(--line)] pt-6 text-sm">
          <p className="font-medium">{t.product.details}</p>
          <ul className="mt-3 space-y-1.5 text-[var(--muted)]">
            {p.details.map((d) => (
              <li key={d.de}>{d[lang]}</li>
            ))}
          </ul>
          <p className="mt-6 font-medium">{t.product.shipping}</p>
          <p className="mt-2 text-[var(--muted)]">{shippingNote}</p>
        </div>
      </div>
    </div>
  );
}
