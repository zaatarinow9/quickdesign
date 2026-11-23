import { Gift } from "lucide-react";

/** Runde Gold-Medaille für Rabatte (z. B. Vorbestellung) */
export function DiscountSeal({ pct, label = "خصم", size = "md" }: { pct: number; label?: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-[4.5rem]" : "size-14";
  return (
    <span
      className={`relative grid ${box} shrink-0 place-items-center rounded-full bg-[conic-gradient(from_210deg,#e9dcb3,#b9a779,#8f7c4f,#d8c690,#e9dcb3)] p-[3px] shadow-[0_8px_18px_-8px_rgba(60,45,10,0.55)]`}
      aria-label={`${label} ${pct}%`}
    >
      <span className="grid h-full w-full place-items-center rounded-full bg-[var(--green)] ring-1 ring-[#e9dcb3]/60">
        <span className="flex flex-col items-center leading-none">
          <span className={`ltr-num font-black text-[#f1e6c4] ${size === "lg" ? "text-[1.15rem]" : "text-[0.95rem]"}`}>{pct}%</span>
          <span className={`mt-0.5 font-medium text-[#e3d3a4]/90 ${size === "lg" ? "text-[0.68rem]" : "text-[0.6rem]"}`}>{label}</span>
        </span>
      </span>
    </span>
  );
}

/** Dezente Angebots-Plakette (z. B. „2 + 1“) */
export function OfferTag({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 py-1 pe-3 ps-1.5 text-[0.78rem] font-bold text-[var(--green)] shadow-[0_6px_16px_-8px_rgba(5,66,57,0.45)] ring-1 ring-[var(--green)]/10 backdrop-blur">
      <span className="grid size-5 place-items-center rounded-full bg-[var(--green)] text-[#e3d3a4]">
        <Gift className="size-3" strokeWidth={2.2} />
      </span>
      <span className="ltr-num">{text}</span>
    </span>
  );
}

/** Schlanke Rabatt-Pille (Produktkarten und -seiten) */
export function DiscountPill({ pct, size = "md" }: { pct: number; size?: "md" | "lg" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[var(--green)] font-bold text-[#f1e6c4] shadow-[0_6px_14px_-8px_rgba(5,66,57,0.7)] ring-1 ring-[#b9a779]/70 ${size === "lg" ? "h-9 px-3.5 text-[0.95rem]" : "h-7 px-2.5 text-[0.78rem]"}`}
      aria-label={`−${pct}%`}
    >
      <span className="ltr-num">−{pct}%</span>
    </span>
  );
}
