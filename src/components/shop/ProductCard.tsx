import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/shop/config";
import { money } from "@/lib/shop/format";
import { Palette } from "lucide-react";
import { DiscountPill, OfferTag } from "./Badges";
import type { ShopDict } from "@/lib/shop/i18n";
import {
  activeVariants,
  detailOf,
  fromPrice,
  imageOf,
  inScope,
  isDarkHex,
  motifImage,
  offerLive,
  preorderLive,
  areaFor,
  type Product,
  type ShopStore,
} from "@/lib/shop/schema";
import { GarmentPreview } from "./GarmentPreview";

export function ProductCard({
  p,
  store,
  lang,
  t,
  href,
  priority = false,
  now,
}: {
  p: Product;
  store: ShopStore;
  lang: Lang;
  t: ShopDict;
  href: string;
  priority?: boolean;
  now: number;
}) {
  const varies = new Set(activeVariants(p).map((v) => v.priceCents)).size > 1;
  const pre = preorderLive(store.settings, now)
    ? store.settings.preorder.pct
    : 0;
  const badge = store.offers.find(
    (o) =>
      offerLive(o, now) && inScope(o.scope, p) && (o.badge.de || o.badge.ar),
  );
  const price = fromPrice(p);
  const detail = detailOf(p);
  // Gestalter-Produkte: Vorschau mit Beispielmotiv vorne, beim Überfahren Rückseite
  const custom = (() => {
    const c = p.colors[0];
    const ms = store.motifs.filter((m) => m.active);
    // eigenes Vorschaubild (fertig gestaltetes Muster) hat Vorrang vor der Live-Vorschau
    if (p.image || !p.custom.enabled || !c?.blankFront || !c.blankBack || !ms.length)
      return null;
    const dark = isDarkHex(c.hex);
    const back =
      ms.find((m) => m.id.startsWith("nisr")) ?? ms[ms.length > 1 ? 1 : 0];
    return {
      c,
      area: { front: areaFor(p.kind, "front"), back: areaFor(p.kind, "back") },
      front: motifImage(ms[0], dark),
      back: motifImage(back, dark),
    };
  })();
  const designs = custom ? store.motifs.filter((m) => m.active).length : 0;
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-[var(--green)]/40 hover:shadow-[0_18px_40px_-24px_rgba(5,66,57,0.55)]"
    >
      <div className="relative aspect-[4/4.2] overflow-hidden bg-[var(--paper-2)]">
        {custom ? (
          <>
            <GarmentPreview
              blank={custom.c.blankFront}
              area={custom.area.front}
              motif={custom.front}
              className="absolute inset-0 transition duration-700 ease-out group-hover:scale-[1.04]"
            />
            <GarmentPreview
              blank={custom.c.blankBack}
              area={custom.area.back}
              motif={custom.back}
              className="absolute inset-0 opacity-0 transition duration-700 ease-out group-hover:opacity-100"
            />
          </>
        ) : (
          <Image
            src={p.custom.enabled && p.image ? p.image : imageOf(p)}
            alt={p.name[lang]}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 270px, 50vw"
            className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        )}
        {detail && !custom ? (
          <Image
            src={detail}
            alt=""
            fill
            sizes="(min-width: 1024px) 270px, 50vw"
            className="object-cover opacity-0 transition duration-700 ease-out group-hover:opacity-100"
          />
        ) : null}
        {pre ? (
          <span className="absolute end-2.5 top-2.5">
            <DiscountPill pct={pre} />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        <h3 className="line-clamp-2 text-[0.98rem] font-bold leading-snug text-[var(--ink)] sm:text-[1.05rem]">
          {p.name[lang]}
        </h3>
        {designs ? (
          <p className="flex items-center gap-1.5 text-[0.78rem] font-medium text-[var(--green)]">
            <Palette className="size-3.5 shrink-0" strokeWidth={2} />
            {lang === "ar" ? `${designs} تصميماً للاختيار` : `${designs} Motive zur Wahl`}
          </p>
        ) : null}
        {badge ? (
          <span className="self-start">
            <OfferTag text={badge.badge[lang] || badge.badge.de} />
          </span>
        ) : null}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-1">
          <p className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
            {varies ? <span className="text-[0.78rem] text-[var(--muted)]">{t.card.from}</span> : null}
            {pre ? (
              <>
                <span className="ltr-num text-[1.05rem] font-bold text-[var(--green)]">
                  {money(Math.round((price * (100 - pre)) / 100))}
                </span>
                <span className="ltr-num text-[0.8rem] text-[var(--muted)] line-through">{money(price)}</span>
              </>
            ) : (
              <span className="ltr-num text-[1.05rem] font-bold">{money(price)}</span>
            )}
          </p>
          {p.colors.length > 1 ? (
            <div className="flex gap-1" aria-label={t.card.colors}>
              {p.colors.map((c) => (
                <span
                  key={c.id}
                  title={c.name[lang]}
                  className="size-3.5 rounded-full ring-1 ring-black/10 ring-offset-1"
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
