"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/shop/config";
import { shopLimits } from "@/lib/shop/config";
import type { ShopDict } from "@/lib/shop/i18n";

export type CartLine = { slug: string; color: string; size: string; qty: number };

type Ctx = {
  lang: Lang;
  base: string;
  t: ShopDict;
  /** Link innerhalb des Shops, z. B. href("/produkt/flagge-8-12") */
  href: (path?: string) => string;
  lines: CartLine[];
  count: number;
  add: (l: CartLine) => void;
  setQty: (i: number, qty: number) => void;
  remove: (i: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const ShopCtx = createContext<Ctx | null>(null);
export const CART_KEY = "qd-shop-cart-v1";
const KEY = CART_KEY;

export function ShopProvider({ lang, base, t, children }: { lang: Lang; base: string; t: ShopDict; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Warenkorb aus dem Browser laden (nur Auswahl – Preise kommen immer vom Server)
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalige Hydration aus localStorage
      if (Array.isArray(raw)) setLines(raw.filter((l) => l && typeof l.slug === "string").slice(0, shopLimits.maxLines));
    } catch {
      /* leer starten */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* privat-Modus */
    }
  }, [lines, loaded]);

  const add = useCallback((l: CartLine) => {
    setLines((ls) => {
      const i = ls.findIndex((x) => x.slug === l.slug && x.color === l.color && x.size === l.size);
      if (i >= 0) return ls.map((x, j) => (j === i ? { ...x, qty: Math.min(shopLimits.maxQtyPerLine, x.qty + l.qty) } : x));
      return [...ls, l].slice(0, shopLimits.maxLines);
    });
    setOpen(true);
  }, []);
  const setQty = useCallback((i: number, qty: number) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Math.min(shopLimits.maxQtyPerLine, qty)) } : x))), []);
  const remove = useCallback((i: number) => setLines((ls) => ls.filter((_, j) => j !== i)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      base,
      t,
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
    [lang, base, t, lines, add, setQty, remove, clear, open],
  );
  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShop() {
  const c = useContext(ShopCtx);
  if (!c) throw new Error("useShop außerhalb des ShopProvider");
  return c;
}
