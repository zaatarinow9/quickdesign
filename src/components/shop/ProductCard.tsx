import Link from "next/link";
import type { Lang } from "@/lib/shop/config";
import type { Product } from "@/lib/shop/catalog";
import { money } from "@/lib/shop/format";
import { Mockup } from "./Mockup";

export function ProductCard({ p, lang, href, viewLabel }: { p: Product; lang: Lang; href: string; viewLabel: string }) {
  const c = p.colors[0];
  return (
    <Link href={href} className="group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 ring-1 ring-white/10 transition duration-500 hover:-translate-y-1 hover:ring-[var(--shop-gold)]/60 sm:p-5">
      {p.badge ? (
        <span className="absolute start-4 top-4 z-10 rounded-full bg-[var(--shop-gold-2)] px-3 py-1 text-[0.7rem] font-semibold text-[#1a140a]">{p.badge[lang]}</span>
      ) : null}
      <div className="relative aspect-[5/5.6] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.10),transparent_70%)]">
        <Mockup garment={p.garment} art={p.artwork} color={c.hex} tone={c.ink} label={p.name[lang]} className="h-full w-full transition duration-700 group-hover:scale-[1.04]" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug">{p.name[lang]}</h3>
          <p className="mt-1 text-sm text-white/60">{p.tagline[lang]}</p>
        </div>
        <span className="ltr-num shrink-0 text-lg font-semibold text-[var(--shop-gold-2)]">{money(p.priceCents)}</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {p.colors.map((col) => (
            <span key={col.id} className="size-4 rounded-full ring-1 ring-white/30" style={{ background: col.hex }} title={col.name[lang]} />
          ))}
        </div>
        <span className="text-sm text-white/70 transition group-hover:text-[var(--shop-gold-2)]">{viewLabel} {lang === "ar" ? "←" : "→"}</span>
      </div>
    </Link>
  );
}
