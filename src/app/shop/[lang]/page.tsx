import Image from "next/image";
import { notFound } from "next/navigation";
import { campaign, daysUntilAnniversary, isLang, offers, shipping, whatsappNumber } from "@/lib/shop/config";
import { products } from "@/lib/shop/catalog";
import { dict, fill } from "@/lib/shop/i18n";
import { dateLong, money } from "@/lib/shop/format";
import { shopBase } from "@/lib/shop/server";
import { ProductCard } from "@/components/shop/ProductCard";

export default async function ShopHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict[lang];
  const base = await shopBase();
  const href = (p = "") => `${base}/${lang}${p}`;
  const days = daysUntilAnniversary();
  const textil = products.filter((p) => p.category === "textil");
  const druck = products.filter((p) => p.category === "druck");
  const wa = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t.groups.message)}`;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pb-24 lg:pt-16">
        <div>
          <p className="text-sm text-[var(--muted)]">{t.hero.eyebrow}</p>
          <h1 className="mt-4 text-[2.6rem] leading-[1.08] sm:text-6xl">{t.hero.title}</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#3d3a35]">{t.hero.text}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#textil" className="inline-flex h-12 items-center rounded-full bg-[var(--ink)] px-6 font-medium text-white transition hover:bg-black">
              {t.hero.cta}
            </a>
            <a href="#gruppen" className="inline-flex h-12 items-center rounded-full px-6 font-medium ring-1 ring-[var(--line)] transition hover:ring-[var(--ink)]">
              {t.hero.ctaGroups}
            </a>
          </div>
          <div className="mt-10 border-s-2 border-[var(--green)] ps-4 text-sm leading-relaxed text-[var(--muted)]">
            <p className="text-[var(--ink)]">{days > 0 ? fill(t.hero.days, { days }) : t.hero.today}</p>
            {days > 6 ? <p>{fill(t.hero.lastOrder, { date: dateLong(campaign.lastOrderDay, lang) })}</p> : null}
          </div>
        </div>
        <div className="relative order-first aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--paper-2)] sm:aspect-square lg:order-none">
          <Image src="/shop/fahne.webp" alt={lang === "ar" ? "علم الثورة السورية" : "Fahne der syrischen Revolution"} fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
        </div>
      </section>

      {/* Angebote */}
      <section className="border-y border-[var(--line)]">
        <div className="mx-auto grid max-w-6xl divide-y divide-[var(--line)] px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 rtl:md:divide-x-reverse">
          {[
            { title: t.offers.bundle.title, text: fill(t.offers.bundle.text, { pct: offers.bundle.pct }) },
            { title: t.offers.tiers.title, text: t.offers.tiers.text },
            { title: t.offers.shipping.title, text: fill(t.offers.shipping.text, { free: money(shipping.freeFromCents) }) },
          ].map((o) => (
            <div key={o.title} className="py-6 md:px-6 md:first:ps-0 md:last:pe-0">
              <p className="font-medium">{o.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{o.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Textilien */}
      <section id="textil" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6">
        <div className="max-w-xl">
          <h2 className="text-3xl sm:text-4xl">{t.sections.textil.title}</h2>
          <p className="mt-3 text-[var(--muted)]">{t.sections.textil.text}</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {textil.map((p, i) => (
            <ProductCard key={p.slug} p={p} lang={lang} t={t} href={href(`/produkt/${p.slug}`)} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* Druck */}
      <section id="druck" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6">
        <div className="max-w-xl">
          <h2 className="text-3xl sm:text-4xl">{t.sections.druck.title}</h2>
          <p className="mt-3 text-[var(--muted)]">{t.sections.druck.text}</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {druck.map((p) => (
            <ProductCard key={p.slug} p={p} lang={lang} t={t} href={href(`/produkt/${p.slug}`)} />
          ))}
        </div>
      </section>

      {/* Geschichte */}
      <section id="geschichte" className="mx-auto mt-28 max-w-6xl scroll-mt-20 px-4 sm:px-6">
        <div className="grid gap-8 border-t border-[var(--line)] pt-14 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <p className="text-sm text-[var(--muted)]">{t.story.eyebrow}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">{t.story.title}</h2>
            <p className="ltr-num mt-8 text-6xl font-medium text-[var(--green)] sm:text-7xl">8.12.2024</p>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-[#3d3a35] md:pt-9">
            <p>{t.story.p1}</p>
            <p>{t.story.p2}</p>
          </div>
        </div>
      </section>

      {/* Sammelbestellung */}
      <section id="gruppen" className="mx-auto mt-24 max-w-6xl scroll-mt-20 px-4 sm:px-6">
        <div className="grid items-center gap-8 rounded-2xl bg-[var(--card)] p-8 ring-1 ring-[var(--line)] sm:p-12 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-sm text-[var(--muted)]">{t.groups.eyebrow}</p>
            <h2 className="mt-3 text-3xl">{t.groups.title}</h2>
            <p className="mt-4 max-w-lg leading-relaxed text-[#3d3a35]">{t.groups.text}</p>
          </div>
          <div className="md:text-end">
            <a href={wa} target="_blank" rel="noopener" className="inline-flex h-12 items-center rounded-full bg-[var(--green)] px-6 font-medium text-white transition hover:brightness-110">
              {t.groups.cta}
            </a>
            <p className="ltr-num mt-3 text-sm text-[var(--muted)]">+49 1577 2785677</p>
          </div>
        </div>
      </section>
    </>
  );
}
