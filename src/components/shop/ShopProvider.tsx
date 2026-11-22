"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/shop/config";
import type { ShopDict } from "@/lib/shop/i18n";
import { resolveLine, type ShopStore } from "@/lib/shop/schema";

/** front/back: Motiv-IDs beim Selbstgestalten (leer = keine Seite) */
export type CartLine = { slug: string; color: string; size: string; qty: number; front?: string; back?: string; frontPos?: "center" | "chest" };
const sameLine = (a: CartLine, b: CartLine) => a.slug === b.slug && a.color === b.color && a.size === b.size && (a.front ?? "") === (b.front ?? "") && (a.back ?? "") === (b.back ?? "") && (a.frontPos ?? "center") === (b.frontPos ?? "center");

type Ctx = {
  lang: Lang;
  base: string;
  t: ShopDict;
  store: ShopStore;
  /** Link innerhalb des Shops, z. B. href("/produkt/tshirt-fahne") */
  href: (path?: string) => string;
  lines: CartLine[];
  count: number;
  add: (l: CartLine | CartLine[]) => void;
  setQty: (i: number, qty: number) => void;
  remove: (i: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const ShopCtx = createContext<Ctx | null>(null);
export const CART_KEY = "qd-shop-cart-v3";
const MAX_LINES = 40;

export function ShopProvider({ lang, base, t, store, children }: { lang: Lang; base: string; t: ShopDict; store: ShopStore; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Warenkorb aus dem Browser laden (nur Auswahl – Preise kommen immer vom Server)
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalige Hydration aus localStorage
      if (Array.isArray(raw)) setLines(raw.filter((l) => l && typeof l.slug === "string" && resolveLine(store, l)).slice(0, MAX_LINES));
    } catch {
      /* leer starten */
    }
    setLoaded(true);
  }, [store]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* privat-Modus */
    }
  }, [lines, loaded]);

  const maxOf = useCallback((slug: string) => store.products.find((p) => p.id === slug)?.maxQty ?? 50, [store]);

  const add = useCallback(
    (input: CartLine | CartLine[]) => {
      const list = (Array.isArray(input) ? input : [input]).filter((l) => l.qty > 0);
      if (!list.length) return;
      setLines((ls) => {
        let next = [...ls];
        for (const l of list) {
          const i = next.findIndex((x) => sameLine(x, l));
          if (i >= 0) next = next.map((x, j) => (j === i ? { ...x, qty: Math.min(maxOf(l.slug), x.qty + l.qty) } : x));
          else next.push({ ...l, qty: Math.min(maxOf(l.slug), l.qty) });
        }
        return next.slice(0, MAX_LINES);
      });
      setOpen(true);
    },
    [maxOf],
  );
  const setQty = useCallback(
    (i: number, qty: number) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Math.min(maxOf(x.slug), qty)) } : x))),
    [maxOf],
  );
  const remove = useCallback((i: number) => setLines((ls) => ls.filter((_, j) => j !== i)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      base,
      t,
      store,
      href: (path = "") => `${base}/${lang}${path}`,
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add,
      setQty,
      remove,
      clear,
      open,
      setOpen,
    }),
    [lang, base, t, store, lines, add, setQty, remove, clear, open],
  );
  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShop() {
  const c = useContext(ShopCtx);
  if (!c) throw new Error("useShop außerhalb des ShopProvider");
  return c;
}
