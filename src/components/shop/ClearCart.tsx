"use client";

import { useEffect } from "react";
import { CART_KEY, useShop } from "./ShopProvider";

/** Leert den Warenkorb nach erfolgreicher Zahlung (Speicher zuerst, da dieser Effekt vor dem Laden im Provider läuft) */
export function ClearCart() {
  const { clear } = useShop();
  useEffect(() => {
    try {
      localStorage.removeItem(CART_KEY);
    } catch {
      /* privat-Modus */
    }
    clear();
  }, [clear]);
  return null;
}
