"use client";

import { useEffect, useState } from "react";
import { campaign } from "@/lib/shop/config";
import { useShop } from "./ShopProvider";

const target = new Date(campaign.anniversary).getTime();

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Countdown bis 8.12.2026 – Ziffern bleiben auch auf Arabisch LTR */
export function Countdown() {
  const { t } = useShop();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Uhrzeit erst im Browser (kein Hydration-Mismatch)
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = now === null ? null : target - now;
  if (left !== null && left <= 0) return <p className="text-lg font-semibold text-[var(--shop-gold-2)]">{t.countdown.over}</p>;
  const p = left === null ? null : parts(left);
  const cells = [
    { v: p?.d, l: t.countdown.days },
    { v: p?.h, l: t.countdown.hours },
    { v: p?.m, l: t.countdown.minutes },
    { v: p?.s, l: t.countdown.seconds },
  ];
  return (
    <div className="flex gap-2 sm:gap-3" aria-live="off">
      {cells.map((c, i) => (
        <div key={i} className="w-[4.4rem] rounded-2xl bg-white/[0.06] px-2 py-3 text-center ring-1 ring-white/10 backdrop-blur sm:w-20">
          <span className="ltr-num block font-[family-name:var(--font-display)] text-3xl font-medium text-white sm:text-4xl">{c.v === undefined ? "––" : String(c.v).padStart(2, "0")}</span>
          <span className="mt-1 block text-[0.68rem] uppercase tracking-wider text-white/55">{c.l}</span>
        </div>
      ))}
    </div>
  );
}
