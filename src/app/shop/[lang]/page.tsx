import Image from "next/image";
import { notFound } from "next/navigation";
import { daysUntilAnniversary, isLang } from "@/lib/shop/config";
import { dict, fill } from "@/lib/shop/i18n";
import { dateLong, money } from "@/lib/shop/format";
import { shopBase } from "@/lib/shop/server";
import { getStore } from "@/lib/shop/store";
import { activeProducts, offerLive, preorderLive } from "@/lib/shop/schema";
import { HeroFlag } from "@/components/shop/HeroFlag";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/shop/Reveal";

const nowMs = () => Date.now();

export default async function ShopHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict[lang];
  const [base, store] = await Promise.all([shopBase(), getStore()]);
  const href = (p = "") => `${base}/${lang}${p}`;
  const now = nowMs();
  const s = store.settings;
  const days = daysUntilAnniversary(s.campaign.anniversary, now);
  const live = store.offers.filter((o) => offerLive(o, now));
  const pre = preorderLive(s, now);
  const products = activeProducts(store);
  const textil = products.filter((p) => p.category === "textil");
  const druck = products.filter((p) => p.category === "druck");

  const ticker = [
    days > 0 ? fill(t.hero.days, { days }) : t.hero.today,
    pre ? fill(t.preorder.bar, { pct: s.preorder.pct, date: dateLong(s.preorder.until, lang) }) : null,
    ...live.map((o) => o.name[lang]),
    s.shipping.express.enabled ? fill(t.hero.express, { days: s.shipping.express.days }) : null,
    s.campaign.lastOrderDay && days > 6 ? fill(t.hero.lastOrder, { date: dateLong(s.campaign.lastOrderDay, lang) }) : null,
  ].filter(Boolean) as string[];

  const offerCards = [
    ...(pre
      ? [{ key: "pre", big: `−${s.preorder.pct} %`, title: lang === "ar" ? "طلب مسبق" : "Vorbestellung", text: fill(t.preorder.bar, { pct: s.preorder.pct, date: dateLong(s.preorder.until, lang) }), dark: true }]
      : []),
    ...live.map((o) => ({
      key: o.id,
      big: o.badge[lang] || (o.kind === "percent" ? `−${o.percent} %` : "%"),
      title: o.name[lang],
      text:
        o.kind === "tiers"
          ? (o.tiers ?? []).map((x) => (lang === "ar" ? `من ${x.min}: ⁦−${x.pct}%⁩` : `ab ${x.min} Stück −${x.pct} %`)).join(" · ")
          : o.kind === "bundle" && o.bundle?.mode === "price"
            ? lang === "ar"
              ? `${o.bundle.qty} قطع بـ ⁦${money(o.bundle.value)}⁩`
              : `${o.bundle.qty} Teile für ${money(o.bundle.value)}`
            : "",
      dark: false,
    })),
    ...(s.shipping.express.enabled
      ? [{ key: "express", big: lang === "ar" ? `${s.shipping.express.days} أيام` : `${s.shipping.express.days} Tage`, title: lang === "ar" ? "شحن سريع" : "Express", text: fill(t.product.shippingExpress, { price: money(s.shipping.express.cents), days: s.shipping.express.days }), dark: false }]
      : []),
  ].slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative -mt-16 flex min-h-[100svh] items-end overflow-hidden bg-black text-white">
        <div className="shop-flag-fallback absolute inset-0 opacity-60" aria-hidden />
        {s.hero.image ? (
          <Image src={s.hero.image} alt="" fill priority sizes="100vw" className="ken object-cover" />
        ) : (
          <HeroFlag />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.05)_35%,rgba(0,0,0,0.55)_70%,rgba(0,0,0,0.9)_100%)]" aria-hidden />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55),transparent_60%)] rtl:bg-[linear-gradient(270deg,rgba(0,0,0,0.55),transparent_60%)]" aria-hidden />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-32 sm:px-6 sm:pb-28">
          <p className="rise text-sm tracking-wide text-white/80 sm:text-base" style={{ animationDelay: "150ms" }}>
            {s.hero.eyebrow[lang]}
          </p>
          <h1 className="rise mt-4 max-w-4xl text-[3.4rem] leading-[0.98] sm:text-[6rem] lg:text-[7.5rem]" style={{ animationDelay: "300ms" }}>
            {s.hero.title[lang]}
          </h1>
          <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl" style={{ animationDelay: "500ms" }}>
            {s.hero.text[lang]}
          </p>
          <div className="rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "700ms" }}>
            <a href="#kollektion" className="inline-flex h-13 items-center rounded-full bg-white px-7 py-3.5 font-medium text-black transition hover:bg-[#e9f2ec]">
              {t.hero.cta}
            </a>
            <a href="#geschichte" className="inline-flex h-13 items-center rounded-full px-7 py-3.5 font-medium text-white ring-1 ring-white/40 backdrop-blur-sm transition hover:bg-white/10">
              {t.hero.story}
            </a>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 z-10 overflow-hidden border-t border-white/15 bg-black/40 py-3 text-sm text-white/85 backdrop-blur-sm">
          <div className="marquee flex w-max gap-10 whitespace-nowrap ps-10">
            {[...ticker, ...ticker].map((x, i) => (
              <span key={i} className="flex items-center gap-10">
                {x}
                <span className="text-[var(--red)]" aria-hidden>★</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Angebote */}
      {offerCards.length ? (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
          <Reveal>
            <h2 className="text-sm text-[var(--muted)]">{t.sections.offers}</h2>
          </Reveal>
          <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${offerCards.length > 2 ? "lg:grid-cols-4" : ""}`}>
            {offerCards.map((o, i) => (
              <Reveal key={o.key} delay={i * 90}>
                <div className={`flex h-full flex-col justify-between rounded-2xl p-6 ${o.dark ? "bg-[var(--ink)] text-white" : "bg-[var(--card)] ring-1 ring-[var(--line)]"}`}>
                  <p className={`ltr-num text-4xl font-medium tracking-tight ${o.dark ? "text-white" : "text-[var(--green)]"}`}>{o.big}</p>
                  <div className="mt-8">
                    <p className="font-medium">{o.title}</p>
                    {o.text ? <p className={`mt-1 text-sm leading-relaxed ${o.dark ? "text-white/70" : "text-[var(--muted)]"}`}>{o.text}</p> : null}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* Kollektion */}
      <section id="kollektion" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6 sm:pt-28">
        <Reveal>
          <p className="text-sm text-[var(--muted)]">{t.sections.collection.eyebrow}</p>
          <h2 className="mt-2 text-4xl sm:text-5xl">{t.sections.collection.title}</h2>
        </Reveal>
        {textil.length ? (
          <>
            <h3 className="mt-12 text-xl">{t.sections.textil}</h3>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {textil.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 80}>
                  <ProductCard p={p} store={store} lang={lang} t={t} href={href(`/produkt/${p.id}`)} priority={i < 2} now={now} />
                </Reveal>
              ))}
            </div>
          </>
        ) : null}
        {druck.length ? (
          <>
            <h3 className="mt-20 text-xl">{t.sections.druck}</h3>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {druck.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 80}>
                  <ProductCard p={p} store={store} lang={lang} t={t} href={href(`/produkt/${p.id}`)} now={now} />
                </Reveal>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {/* Geschichte */}
      <section id="geschichte" className="mt-28 scroll-mt-16 bg-[#0c0c0c] text-white">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <Reveal>
            <p className="ltr-num text-sm text-white/60">{s.story.eyebrow[lang]}</p>
            <h2 className="mt-4 max-w-4xl text-5xl leading-[1.02] sm:text-7xl">{s.story.title[lang]}</h2>
          </Reveal>

          {s.story.images.length ? (
            <div className="mt-16 grid auto-rows-[220px] grid-cols-2 gap-3 sm:auto-rows-[260px] lg:grid-cols-4">
              {s.story.images.slice(0, 6).map((im, i) => (
                <Reveal
                  key={im.url}
                  as="figure"
                  delay={i * 100}
                  className={`group relative overflow-hidden rounded-xl bg-white/5 ${i === 0 ? "col-span-2 row-span-2" : ""} ${i === 3 ? "lg:col-span-2" : ""}`}
                >
                  <Image src={im.url} alt={im.caption[lang] || ""} fill sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover grayscale-[35%] transition duration-[1.6s] ease-out group-hover:scale-105 group-hover:grayscale-0" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 text-sm">
                    {im.caption[lang] ? <span className="block text-white/90">{im.caption[lang]}</span> : null}
                    {im.credit ? <span className="mt-1 block text-[0.68rem] text-white/50">{im.credit}</span> : null}
                  </figcaption>
                </Reveal>
              ))}
            </div>
          ) : null}

          <div className="mt-16 grid gap-12 md:grid-cols-[1.3fr_1fr] md:gap-20">
            <div className="space-y-6 text-lg leading-relaxed text-white/75 sm:text-xl">
              {s.story.paragraphs.map((p, i) => (
                <Reveal key={i} delay={i * 120}>
                  <p>{p[lang]}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <blockquote className="border-s-2 border-[var(--red)] ps-6 text-3xl leading-snug text-white sm:text-4xl">{s.story.quote[lang]}</blockquote>
              <div className="mt-10 flex items-baseline gap-4">
                <span className="ltr-num text-6xl font-medium text-[#3fbf7a] sm:text-7xl">8.12</span>
                <span className="text-white/50">2024 – 2026</span>
              </div>
            </Reveal>
          </div>
          <Reveal className="mt-20">
            <a href="#kollektion" className="inline-flex h-13 items-center rounded-full bg-white px-7 py-3.5 font-medium text-black transition hover:bg-[#e9f2ec]">
              {t.hero.cta}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
