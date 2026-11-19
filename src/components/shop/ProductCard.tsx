import Image from "next/image";
import Link from "next/link";
import { fromPrice, imageOf, type Product } from "@/lib/shop/catalog";
import type { Lang } from "@/lib/shop/config";
import { money } from "@/lib/shop/format";
import type { ShopDict } from "@/lib/shop/i18n";

export function ProductCard({ p, lang, t, href, priority = false }: { p: Product; lang: Lang; t: ShopDict; href: string; priority?: boolean }) {
  const varies = new Set(p.variants.map((v) => v.priceCents)).size > 1;
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--paper-2)]">
        <Image
          src={imageOf(p)}
          alt={p.name[lang]}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 50vw"
          className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-3">
        <h3 className="text-[0.98rem] leading-snug">{p.name[lang]}</h3>
        <p className="mt-1 text-[0.95rem]">
          {varies ? <span className="text-sm text-[var(--muted)]">{t.card.from} </span> : null}
          <span className="ltr-num">{money(fromPrice(p))}</span>
        </p>
        {p.colors.length > 1 ? (
          <div className="mt-2 flex gap-1.5" aria-label={t.card.colors}>
            {p.colors.map(({ color }) => (
              <span key={color.id} title={color.name[lang]} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: color.hex }} />
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
