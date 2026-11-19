import { notFound } from "next/navigation";
import { Check, MessageCircle, Truck } from "lucide-react";
import { campaign, isLang, shipping, whatsappNumber } from "@/lib/shop/config";
import { products } from "@/lib/shop/catalog";
import { dict, fill } from "@/lib/shop/i18n";
import { dateLong, money } from "@/lib/shop/format";
import { shopBase } from "@/lib/shop/server";
import { Countdown } from "@/components/shop/Countdown";
import { HeroVisual } from "@/components/shop/HeroVisual";
import { ProductCard } from "@/components/shop/ProductCard";
import { Artwork } from "@/components/shop/Artwork";
import { Reveal } from "@/components/shop/Reveal";

export default async function ShopHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict[lang];
  const base = await shopBase();
  const href = (p = "") => `${base}/${lang}${p}`;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,122,61,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(216,178,94,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-1">
          <span className="flex-1 bg-[var(--shop-green)]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-black" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--shop-gold-2)] ring-1 ring-[var(--shop-gold)]/30">
              <span className="size-1.5 rounded-full bg-[var(--shop-red)]" /> {t.hero.eyebrow}
            </p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              {t.hero.title}
              <span className="shop-gold-text shop-shimmer mt-2 block">{t.hero.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{t.hero.text}</p>
            <div className="mt-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/50">{t.hero.countdownLabel}</p>
              <Countdown />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#kollektion" className="inline-flex h-13 items-center rounded-full bg-gradient-to-r from-[#d8b25e] to-[#ecd08a] px-7 py-3.5 font-semibold text-[#14110a] shadow-[0_12px_40px_-12px_rgba(216,178,94,0.7)] transition hover:brightness-105">
                {t.hero.cta}
              </a>
              <p className="flex items-center gap-2 text-sm text-white/60">
                <Truck className="size-4 text-[var(--shop-gold-2)]" aria-hidden />
                {fill(t.hero.lastOrder, { date: dateLong(campaign.lastOrderDay, lang) })}
              </p>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Versand-Leiste */}
      <div className="border-y border-white/10 bg-white/[0.03]">
        <p className="mx-auto max-w-7xl px-4 py-3 text-center text-sm text-white/70 sm:px-6">
          {fill(t.product.shippingText, { std: money(shipping.standardCents), free: money(shipping.freeFromCents) })}
        </p>
      </div>

      {/* Kollektion */}
      <section id="kollektion" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.grid.title}</h2>
              <p className="mt-3 max-w-xl text-white/65">{t.grid.text}</p>
            </div>
            <div className="shop-gold-line h-px w-40" />
          </div>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.06}>
              <ProductCard p={p} lang={lang} href={href(`/produkt/${p.slug}`)} viewLabel={t.grid.view} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Geschichte */}
      <section id="geschichte" className="relative scroll-mt-24 overflow-hidden border-y border-white/10 bg-[#f4f2ed] text-[#0b0b0c]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-28">
          <Reveal>
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(201,162,79,0.25),transparent_65%)]" />
              <Artwork art="jasmine" tone="dark" className="relative h-full w-full [&_svg]:h-full [&_svg]:w-full" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a7a32]">{t.story.eyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t.story.title}</h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-[#3b3934]">
              <p>{t.story.p1}</p>
              <p>{t.story.p2}</p>
              <p>{t.story.p3}</p>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-black/10 pt-8">
              {t.story.facts.map((f) => (
                <div key={f.v}>
                  <dt className="ltr-num font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--shop-green)] sm:text-3xl">{f.k}</dt>
                  <dd className="mt-1 text-sm text-[#5e5b55]">{f.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Sammelbestellung */}
      <section id="gruppen" className="relative scroll-mt-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,122,61,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--shop-gold-2)]">{t.groups.eyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{t.groups.title}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">{t.groups.text}</p>
            <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              {t.groups.points.map((pt) => (
                <li key={pt} className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm ring-1 ring-white/10">
                  <Check className="size-4 shrink-0 text-emerald-400" aria-hidden /> {pt}
                </li>
              ))}
            </ul>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t.groups.message)}`}
              target="_blank"
              rel="noopener"
              className="mt-10 inline-flex items-center gap-2.5 rounded-full bg-[#25d366] px-7 py-4 font-semibold text-[#06210f] shadow-[0_12px_40px_-12px_rgba(37,211,102,0.6)] transition hover:brightness-105"
            >
              <MessageCircle className="size-5" aria-hidden /> {t.groups.cta}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
