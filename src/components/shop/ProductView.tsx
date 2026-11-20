"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, Minus, Palette, Plus } from "lucide-react";
import { activeVariants, detailOf, imageOf, type Product } from "@/lib/shop/schema";
import { money } from "@/lib/shop/format";
import { fill } from "@/lib/shop/i18n";
import { useShop } from "./ShopProvider";
import { DiscountSeal } from "./Badges";
import { PaymentLogos } from "./PaymentLogos";
import { cn } from "@/lib/utils";
import { CustomizerView } from "./CustomizerView";

export function Stepper({ value, onChange, max, label, size = "md" }: { value: number; onChange: (n: number) => void; max: number; label: string; size?: "sm" | "md" }) {
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

type ViewProps = { p: Product; taxNote: string; shippingLines: string[]; offerNames: string[]; prePct: number; whatsapp: string };

/** Größe mit Anzahl: Größe oben, darunter runde −/+ Knöpfe – ohne verschachtelte Rahmen */
export function SizeQty({ label, value, max, onChange, invalid }: { label: string; value: number; max: number; onChange: (n: number) => void; invalid?: boolean }) {
  const on = value > 0;
  const btn = "grid size-7 shrink-0 place-items-center rounded-full transition disabled:opacity-25";
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border px-3 pb-3 pt-3 transition",
        on ? "border-[var(--green)] bg-[var(--mint)]/45" : invalid ? "border-[var(--red)]/60 bg-white" : "border-[var(--line)] bg-white hover:border-[var(--muted)]",
      )}
    >
      <span className={cn("ltr-num text-[0.95rem] font-semibold", on ? "text-[var(--green)]" : "text-[var(--ink)]")}>{label}</span>
      <div className="flex w-full items-center justify-between gap-1">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} className={cn(btn, "bg-[var(--paper-2)] text-[var(--ink)] hover:bg-[var(--line)]")} aria-label={`${label} −`}>
          <Minus className="size-3.5" />
        </button>
        <input
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value.replace(/\D/g, "")) || 0)))}
          onFocus={(e) => e.currentTarget.select()}
          inputMode="numeric"
          aria-label={`الكمية ${label}`}
          className={cn("ltr-num w-10 min-w-0 bg-transparent text-center text-base outline-none", on ? "font-semibold text-[var(--green)]" : "text-[var(--muted)]")}
        />
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className={cn(btn, on ? "bg-[var(--green)] text-white hover:bg-[var(--green-2)]" : "bg-[var(--paper-2)] text-[var(--ink)] hover:bg-[var(--line)]")} aria-label={`${label} +`}>
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ProductView(props: ViewProps) {
  return props.p.custom.enabled ? <CustomizerView {...props} /> : <StandardView {...props} />;
}

function StandardView({
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
  const { t, lang, add, store, href } = useShop();
  const designer = p.kind === "tshirt" || p.kind === "hoodie" ? store.products.find((x) => x.active && x.custom.enabled && x.kind === p.kind) : undefined;
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
          {prePct ? <span className="absolute end-4 top-4"><DiscountSeal pct={prePct} size="lg" label={lang === "ar" ? "طلب مسبق" : "Vorbestellung"} /></span> : null}
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
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {variants.map((v) => (
                  <SizeQty key={v.id} label={v.label[lang]} value={qtys[v.id] ?? 0} max={p.maxQty} invalid={hint && totalPieces === 0} onChange={(x) => setQtys((q) => ({ ...q, [v.id]: x }))} />
                ))}
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

        {designer ? (
          <Link
            href={href(`/produkt/${designer.id}`)}
            className="group mt-5 flex items-center gap-4 rounded-2xl border border-[var(--gold)]/50 bg-gradient-to-l from-[var(--mint)]/60 to-white p-4 transition hover:border-[var(--green)]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--green)] text-white">
              <Palette className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-medium">هل تفضّل تصميماً آخر أو طباعة على الظهر؟</span>
              <span className="block text-sm text-[var(--muted)]">اختر من مكتبة تضم {store.motifs.filter((m) => m.active).length} تصميماً – للأمام أو الخلف أو كليهما</span>
            </span>
            <ChevronLeft className="size-5 text-[var(--green)] transition-transform group-hover:-translate-x-1" />
          </Link>
        ) : null}

        <ProductExtras p={p} shippingLines={shippingLines} offerNames={offerNames} prePct={prePct} whatsapp={whatsapp} />
      </div>
    </div>
  );
}

export function ProductExtras({ p, shippingLines, offerNames, prePct, whatsapp }: Omit<ViewProps, "taxNote">) {
  const { t, lang } = useShop();
  return (
    <>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <span>{lang === "ar" ? "ادفع بأمان عبر" : "Sicher bezahlen"}</span>
          <PaymentLogos />
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
    </>
  );
}
