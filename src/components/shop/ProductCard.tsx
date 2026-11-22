import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/shop/config";
import { money } from "@/lib/shop/format";
import { DiscountSeal, OfferTag } from "./Badges";
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
    if (!p.custom.enabled || !c?.blankFront || !c.blankBack || !ms.length)
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
  return (
    <Link
      href={href}
      className="group block h-full rounded-2xl border border-[var(--line)] bg-white p-2.5 transition hover:border-[var(--green)] hover:shadow-[0_14px_34px_-22px_rgba(5,66,57,0.5)]"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--paper-2)]">
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
            <span className="absolute start-2.5 top-2.5 rounded-full bg-[var(--green)] px-2.5 py-1 text-[0.7rem] text-white shadow-sm">
              {lang === "ar"
                ? `${store.motifs.filter((m) => m.active).length} تصميم للاختيار`
                : "Motiv wählen"}
            </span>
          </>
        ) : (
          <Image
            src={imageOf(p)}
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
          <span className="absolute end-2.5 top-2.5 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105">
            <DiscountSeal pct={pre} label={lang === "ar" ? "خصم" : "Rabatt"} />
          </span>
        ) : null}
        {badge ? (
          <span className="absolute bottom-2.5 start-2.5">
            <OfferTag text={badge.badge[lang] || badge.badge.de} />
          </span>
        ) : null}
      </div>
      <div className="px-1.5 pb-1.5 pt-3">
        <h3 className="text-[0.98rem] font-medium leading-snug">
          {p.name[lang]}
        </h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[0.95rem]">
          {varies ? (
            <span className="text-sm text-[var(--muted)]">{t.card.from}</span>
          ) : null}
          {pre ? (
            <>
              <span className="ltr-num font-bold text-[var(--green)]">
                {money(Math.round((price * (100 - pre)) / 100))}
              </span>
              <span className="ltr-num text-sm text-[var(--muted)] line-through">
                {money(price)}
              </span>
            </>
          ) : (
            <span className="ltr-num">{money(price)}</span>
          )}
        </p>
        {p.colors.length > 1 ? (
          <div className="mt-2 flex gap-1.5" aria-label={t.card.colors}>
            {p.colors.map((c) => (
              <span
                key={c.id}
                title={c.name[lang]}
                className="size-3 rounded-full ring-1 ring-black/10"
                style={{ background: c.hex }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
