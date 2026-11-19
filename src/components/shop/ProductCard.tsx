import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/shop/config";
import { money } from "@/lib/shop/format";
import type { ShopDict } from "@/lib/shop/i18n";
import { activeVariants, detailOf, fromPrice, imageOf, inScope, offerLive, preorderLive, type Product, type ShopStore } from "@/lib/shop/schema";

export function ProductCard({ p, store, lang, t, href, priority = false, now }: { p: Product; store: ShopStore; lang: Lang; t: ShopDict; href: string; priority?: boolean; now: number }) {
  const varies = new Set(activeVariants(p).map((v) => v.priceCents)).size > 1;
  const pre = preorderLive(store.settings, now) ? store.settings.preorder.pct : 0;
  const badge = store.offers.find((o) => offerLive(o, now) && inScope(o.scope, p) && (o.badge.de || o.badge.ar));
  const price = fromPrice(p);
  const detail = detailOf(p);
  return (
    <Link href={href} className="group block h-full rounded-2xl border border-[var(--line)] bg-white p-2.5 transition hover:border-[var(--green)] hover:shadow-[0_14px_34px_-22px_rgba(5,66,57,0.5)]">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--paper-2)]">
        <Image
          src={imageOf(p)}
          alt={p.name[lang]}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 270px, 50vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        {detail ? (
          <Image src={detail} alt="" fill sizes="(min-width: 1024px) 270px, 50vw" className="object-cover opacity-0 transition duration-700 ease-out group-hover:opacity-100" />
        ) : null}
        <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {pre ? <span className="ltr-num rounded-full bg-[var(--green)] px-2.5 py-1 text-xs font-medium text-white">−{pre} %</span> : null}
          {badge ? <span className="rounded-full bg-[var(--mint)] px-2.5 py-1 text-xs font-medium text-[var(--green)] shadow-sm">{badge.badge[lang] || badge.badge.de}</span> : null}
        </div>
      </div>
      <div className="px-1.5 pb-1.5 pt-3">
        <h3 className="text-[0.98rem] font-medium leading-snug">{p.name[lang]}</h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[0.95rem]">
          {varies ? <span className="text-sm text-[var(--muted)]">{t.card.from}</span> : null}
          {pre ? (
            <>
              <span className="ltr-num font-bold text-[var(--green)]">{money(Math.round((price * (100 - pre)) / 100))}</span>
              <span className="ltr-num text-sm text-[var(--muted)] line-through">{money(price)}</span>
            </>
          ) : (
            <span className="ltr-num">{money(price)}</span>
          )}
        </p>
        {p.colors.length > 1 ? (
          <div className="mt-2 flex gap-1.5" aria-label={t.card.colors}>
            {p.colors.map((c) => (
              <span key={c.id} title={c.name[lang]} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
