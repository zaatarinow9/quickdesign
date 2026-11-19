"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Lock, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { productBySlug } from "@/lib/shop/catalog";
import { shipping, whatsappNumber } from "@/lib/shop/config";
import { money } from "@/lib/shop/format";
import { fill } from "@/lib/shop/i18n";
import { Mockup } from "./Mockup";
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

  const rows = lines
    .map((l, i) => {
      const p = productBySlug(l.slug);
      const c = p?.colors.find((x) => x.id === l.color);
      return p && c ? { i, l, p, c } : null;
    })
    .filter((r): r is NonNullable<typeof r> => !!r);
  const subtotal = rows.reduce((s, r) => s + r.p.priceCents * r.l.qty, 0);
  const missing = Math.max(0, shipping.freeFromCents - subtotal);
  const progress = Math.min(100, (subtotal / shipping.freeFromCents) * 100);

  const checkout = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, items: rows.map((r) => r.l) }),
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

  const waText = encodeURIComponent(
    `${t.groups.message}\n\n${rows.map((r) => `• ${r.l.qty}× ${r.p.name[lang]} – ${r.c.name[lang]} – ${r.l.size}`).join("\n")}`,
  );

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.cart.title}>
          <motion.button
            type="button"
            aria-label="Schließen"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-[#0f1211] text-white shadow-2xl"
            initial={{ x: lang === "ar" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: lang === "ar" ? "-100%" : "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag className="size-5 text-[var(--shop-gold-2)]" aria-hidden /> {t.cart.title}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label="Schließen">
                <X className="size-5" />
              </button>
            </header>

            {rows.length ? (
              <>
                <div className="border-b border-white/10 px-5 py-3 text-sm">
                  <p className={missing ? "text-white/75" : "font-semibold text-emerald-300"}>
                    {missing ? fill(t.cart.freeHint, { amount: money(missing) }) : t.cart.freeReached}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--shop-green)] to-[var(--shop-gold)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <ul className="flex-1 divide-y divide-white/10 overflow-y-auto px-5">
                  {rows.map(({ i, l, p, c }) => (
                    <li key={`${l.slug}-${l.color}-${l.size}`} className="flex gap-4 py-4">
                      <Link href={href(`/produkt/${p.slug}`)} onClick={() => setOpen(false)} className="w-20 shrink-0 rounded-xl bg-white/[0.04] p-1">
                        <Mockup garment={p.garment} art={p.artwork} color={c.hex} tone={c.ink} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">{p.name[lang]}</p>
                        <p className="mt-0.5 text-xs text-white/60">
                          {c.name[lang]} · <span className="ltr-num">{l.size}</span>
                        </p>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center rounded-full ring-1 ring-white/15">
                            <button type="button" onClick={() => setQty(i, l.qty - 1)} className="grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="−">
                              <Minus className="size-3.5" />
                            </button>
                            <span className="ltr-num w-7 text-center text-sm">{l.qty}</span>
                            <button type="button" onClick={() => setQty(i, l.qty + 1)} className="grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="+">
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <span className="ltr-num font-semibold">{money(p.priceCents * l.qty)}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => remove(i)} className="self-start text-white/40 hover:text-red-300" aria-label={t.cart.remove}>
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <footer className="space-y-3 border-t border-white/10 px-5 py-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">{t.cart.subtotal}</span>
                    <span className="ltr-num text-lg font-semibold">{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/55">
                    <span>{t.cart.shipping}</span>
                    <span>{missing ? t.cart.shippingCalc : t.cart.freeReached}</span>
                  </div>
                  {state === "disabled" ? (
                    <div className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-100 ring-1 ring-amber-300/30">
                      {t.cart.disabled}
                      <a href={`https://wa.me/${whatsappNumber}?text=${waText}`} target="_blank" rel="noopener" className="mt-2 block font-semibold text-[var(--shop-gold-2)] underline">
                        WhatsApp →
                      </a>
                    </div>
                  ) : state === "error" ? (
                    <p className="text-sm text-red-300">{t.cart.error}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={checkout}
                    disabled={state === "loading"}
                    className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d8b25e] to-[#ecd08a] py-3.5 font-semibold text-[#14110a] shadow-[0_10px_30px_-10px_rgba(216,178,94,0.6)] transition hover:brightness-105 disabled:opacity-70"
                  >
                    {state === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                    {state === "loading" ? t.cart.loading : t.cart.checkout}
                  </button>
                  <p className="text-center text-[0.7rem] text-white/45">{t.cart.payments}</p>
                  <p className="text-center text-[0.7rem] text-white/45">{t.cart.agb}</p>
                </footer>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-white/70">
                <ShoppingBag className="size-12 text-white/25" aria-hidden />
                <p>{t.cart.empty}</p>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full px-5 py-2.5 text-sm ring-1 ring-white/20 hover:bg-white/10">
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
