"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { imageOf, resolveLine, type ResolvedLine } from "@/lib/shop/catalog";
import { offers, whatsappNumber } from "@/lib/shop/config";
import { money } from "@/lib/shop/format";
import { fill } from "@/lib/shop/i18n";
import { priceLines } from "@/lib/shop/pricing";
import { useShop } from "./ShopProvider";

export function CartDrawer() {
  const { t, lang, lines, open, setOpen, setQty, remove, href } = useShop();
  const [state, setState] = useState<"idle" | "loading" | "disabled" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, setOpen]);

  const rows = useMemo(
    () => lines.map((l, i) => ({ i, l, r: resolveLine(l) })).filter((x): x is { i: number; l: (typeof lines)[number]; r: ResolvedLine } => !!x.r),
    [lines],
  );
  const price = useMemo(() => priceLines(rows.map((x) => x.r)), [rows]);
  const progress = Math.min(100, (price.total / (price.total + price.freeShippingMissing || 1)) * 100);
  const textileCount = rows.filter((x) => x.r.product.category === "textil").reduce((s, x) => s + x.r.qty, 0);

  const checkout = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, items: rows.map((x) => x.l) }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setState(data.error === "disabled" ? "disabled" : "error");
    } catch {
      setState("error");
    }
  };

  const describe = (r: ResolvedLine) => [r.color?.name[lang], r.variant.label[lang]].filter(Boolean).join(" · ");
  const waText = encodeURIComponent(`${t.groups.message}\n\n${rows.map(({ r }) => `• ${r.qty}× ${r.product.name[lang]} – ${describe(r)}`).join("\n")}`);
  const side = lang === "ar" ? "-100%" : "100%";

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.cart.title}>
          <motion.button
            type="button"
            aria-label="×"
            className="absolute inset-0 cursor-default bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: side }}
            animate={{ x: 0 }}
            exit={{ x: side }}
            transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-[var(--paper)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <h2 className="text-xl">{t.cart.title}</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-[var(--paper-2)]" aria-label="×">
                <X className="size-5" strokeWidth={1.6} />
              </button>
            </div>

            {rows.length ? (
              <>
                <div className="space-y-2 border-b border-[var(--line)] px-5 py-4 text-sm">
                  <p className="text-[var(--muted)]">{price.freeShippingMissing ? fill(t.cart.freeHint, { amount: money(price.freeShippingMissing) }) : t.cart.freeReached}</p>
                  <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]">
                    <div className="h-full rounded-full bg-[var(--green)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  {textileCount > 0 && price.textileToNext > 0 ? (
                    <p className="pt-1 text-[var(--muted)]">
                      <span className="ltr-num me-1.5 rounded bg-[var(--green)] px-1.5 py-0.5 text-xs font-medium text-white">2 + 1</span>
                      {fill(price.textileToNext === 1 ? t.cart.bundleHint : t.cart.bundleHintMany, { n: price.textileToNext, pct: offers.bundle.pct })}
                    </p>
                  ) : null}
                </div>

                <ul className="flex-1 divide-y divide-[var(--line)] overflow-y-auto px-5">
                  {rows.map(({ i, r }, k) => {
                    const pl = price.lines[k];
                    return (
                      <li key={`${r.product.slug}-${r.color?.id}-${r.variant.id}`} className="flex gap-4 py-4">
                        <Link href={href(`/produkt/${r.product.slug}`)} onClick={() => setOpen(false)} className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-[var(--paper-2)]">
                          <Image src={imageOf(r.product, r.color?.id)} alt="" fill sizes="80px" className="object-cover" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[0.95rem] leading-snug">{r.product.name[lang]}</p>
                            <button type="button" onClick={() => remove(i)} className="text-xs text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline">
                              {t.cart.remove}
                            </button>
                          </div>
                          <p className="mt-0.5 text-sm text-[var(--muted)]">{describe(r)}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center rounded-full ring-1 ring-[var(--line)]">
                              <button type="button" onClick={() => setQty(i, r.qty - 1)} className="grid size-8 place-items-center text-[var(--muted)] hover:text-[var(--ink)]" aria-label="−">
                                <Minus className="size-3.5" />
                              </button>
                              <span className="ltr-num w-7 text-center text-sm">{r.qty}</span>
                              <button type="button" onClick={() => setQty(i, r.qty + 1)} className="grid size-8 place-items-center text-[var(--muted)] hover:text-[var(--ink)]" aria-label="+">
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                            <p className="flex items-baseline gap-2 text-sm">
                              {pl.tierPct ? <span className="ltr-num text-[var(--muted)] line-through">{money(pl.listCents * r.qty)}</span> : null}
                              <span className="ltr-num">{money(pl.unitCents * r.qty)}</span>
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-[var(--line)] px-5 py-5">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[var(--muted)]">{t.cart.subtotal}</dt>
                      <dd className="ltr-num">{money(price.listTotal)}</dd>
                    </div>
                    {price.tierSavings ? (
                      <div className="flex justify-between text-[var(--green)]">
                        <dt>{t.cart.tierSavings}</dt>
                        <dd className="ltr-num">−{money(price.tierSavings)}</dd>
                      </div>
                    ) : null}
                    {price.bundleCents ? (
                      <div className="flex justify-between text-[var(--green)]">
                        <dt>{t.cart.bundle}</dt>
                        <dd className="ltr-num">−{money(price.bundleCents)}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <dt className="text-[var(--muted)]">{t.cart.shipping}</dt>
                      <dd className="text-[var(--muted)]">{price.shippingCents ? t.cart.shippingCalc : t.cart.freeReached}</dd>
                    </div>
                    <div className="flex justify-between border-t border-[var(--line)] pt-2.5 text-base font-medium">
                      <dt>{t.cart.total}</dt>
                      <dd className="ltr-num">{money(price.total)}</dd>
                    </div>
                  </dl>

                  {state === "disabled" || state === "error" ? (
                    <div className="mt-4 rounded-xl bg-[var(--card)] p-4 text-sm leading-relaxed ring-1 ring-[var(--line)]">
                      <p>{state === "disabled" ? t.cart.disabled : t.cart.error}</p>
                      <a href={`https://wa.me/${whatsappNumber}?text=${waText}`} target="_blank" rel="noopener" className="mt-2 inline-block font-medium text-[var(--green)] underline underline-offset-4">
                        WhatsApp
                      </a>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={checkout}
                    disabled={state === "loading"}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] font-medium text-white transition hover:bg-black disabled:opacity-70"
                  >
                    {state === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {state === "loading" ? t.cart.loading : t.cart.checkout}
                  </button>
                  <p className="mt-3 text-center text-xs text-[var(--muted)]">{t.cart.payments}</p>
                  <p className="mt-1 text-center text-xs text-[var(--muted)]">
                    <Link href={href("/agb")} onClick={() => setOpen(false)} className="underline-offset-4 hover:underline">
                      {t.cart.agb}
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-[var(--muted)]">{t.cart.empty}</p>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full px-5 py-2.5 ring-1 ring-[var(--line)] hover:ring-[var(--ink)]">
                  {t.cart.continue}
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
