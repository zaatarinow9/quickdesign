import { WavingFlag } from "@/components/brand/WavingFlag";

/** Hinweis im Header auf die Kollektion zum Tag der Befreiung (shop.quickdesign24.de) */
export function LiberationChip({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://shop.quickdesign24.de"
      className={`group relative flex h-10 items-center gap-2.5 overflow-hidden rounded-full bg-paper/[0.07] pl-2.5 pr-4 text-[0.9rem] text-paper ring-1 ring-paper/15 transition hover:bg-paper/[0.12] ${className}`}
      aria-label="Tag der Befreiung – Kollektion zum 8. Dezember im Shop"
    >
      <span aria-hidden className="qd-shine pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <WavingFlag className="h-[18px] w-auto drop-shadow" amp={5} dur={2.6} />
      <span className="font-medium tabular-nums">8.12.</span>
      <span className="hidden text-paper/70 2xl:inline">Tag der Befreiung</span>
    </a>
  );
}
