import Image from "next/image";
import { notFound } from "next/navigation";
import { daysUntilAnniversary, isLang } from "@/lib/shop/config";
import { dict, fill } from "@/lib/shop/i18n";
import { dateLong, money } from "@/lib/shop/format";
import { shopBase } from "@/lib/shop/server";
import { getStore } from "@/lib/shop/store";
import { activeProducts, offerLive, preorderLive } from "@/lib/shop/schema";
import { WavingFlag } from "@/components/brand/WavingFlag";
import { imageOf } from "@/lib/shop/schema";
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

  // Kacheln: je Art das erste sichtbare Produkt
  const pick = (kinds: string[]) => kinds.map((k) => products.find((p) => p.kind === k)).find(Boolean);
  const tiles = [
    { p: pick(["tshirt"]), label: lang === "ar" ? "تيشرتات" : "T-Shirts", to: "#textil" },
    { p: pick(["hoodie"]), label: lang === "ar" ? "هوديات" : "Hoodies", to: "#textil" },
    { p: pick(["flag", "banner"]), label: lang === "ar" ? "أعلام ولافتات" : "Fahnen & Banner", to: "#druck" },
    { p: pick(["sticker", "foil"]), label: lang === "ar" ? "ستيكرات وملصقات" : "Sticker & Folien", to: "#druck" },
  ].filter((x) => x.p && imageOf(x.p));

  return (
    <>
      {/* Einstieg: ruhige, helle Karte */}
      <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
        <div className="rounded-[2rem] bg-[var(--card)] p-6 shadow-[0_1px_0_rgba(0,0,0,0.02),0_20px_60px_-30px_rgba(0,0,0,0.15)] ring-1 ring-[var(--line)] sm:p-10 md:p-14">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="rise flex items-center gap-2.5 text-sm text-[var(--muted)]" style={{ animationDelay: "80ms" }}>
                <WavingFlag className="h-4 w-auto" amp={4} dur={3} />
                {s.hero.eyebrow[lang]}
              </p>
              <h1 className="rise mt-4 text-4xl leading-tight sm:text-5xl" style={{ animationDelay: "180ms" }}>
                {s.hero.title[lang]}
              </h1>
              <p className="rise mt-4 leading-relaxed text-[var(--muted)]" style={{ animationDelay: "280ms" }}>
                {s.hero.text[lang]}
              </p>
            </div>
            <a href="#kollektion" className="rise inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-[var(--ink)] px-6 font-medium text-white transition-colors hover:bg-[var(--green)] md:self-auto" style={{ animationDelay: "380ms" }}>
              {t.hero.cta} <span aria-hidden className="rtl:rotate-180">→</span>
            </a>
          </div>

          {s.hero.image ? (
            <div className="relative mt-10 aspect-[16/7] overflow-hidden rounded-2xl bg-[var(--paper-2)]">
              <Image src={s.hero.image} alt="" fill priority sizes="(min-width: 1152px) 1050px, 100vw" className="object-cover" />
            </div>
          ) : null}

          <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {tiles.map((x, i) => (
              <li key={x.label} className="rise" style={{ animationDelay: `${450 + i * 90}ms` }}>
                <a href={x.to} className="group block">
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-[var(--paper-2)]">
                    <Image src={imageOf(x.p!)} alt={x.label} fill priority={i < 2} sizes="(min-width: 768px) 260px, 45vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                  </span>
                  <span className="mt-3 block text-sm text-[var(--muted)] transition-colors group-hover:text-[var(--ink)]">{x.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Laufband mit Terminen und Angeboten */}
      <div className="mt-8 overflow-hidden border-y border-[var(--line)] py-3 text-sm text-[var(--muted)]">
        <div className="marquee flex w-max gap-10 whitespace-nowrap ps-10">
          {[...ticker, ...ticker].map((x, i) => (
            <span key={i} className="flex items-center gap-10">
              {x}
              <span className="text-[var(--red)]" aria-hidden>★</span>
            </span>
          ))}
        </div>
      </div>

      {/* Angebote */}
      {offerCards.length ? (
        <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16">
          <Reveal>
            <h2 className="text-sm text-[var(--muted)]">{t.sections.offers}</h2>
          </Reveal>
          <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${offerCards.length > 2 ? "lg:grid-cols-4" : ""}`}>
            {offerCards.map((o, i) => (
              <Reveal key={o.key} delay={i * 90}>
                <div className={`flex h-full flex-col justify-between rounded-2xl p-6 ${o.dark ? "bg-[var(--green)] text-white" : "bg-[var(--card)] ring-1 ring-[var(--line)]"}`}>
                  <p className={`ltr-num text-4xl font-medium tracking-tight ${o.dark ? "text-white" : "text-[var(--green)]"}`}>{o.big}</p>
                  <div className="mt-8">
                    <p className="font-medium">{o.title}</p>
                    {o.text ? <p className={`mt-1 text-sm leading-relaxed ${o.dark ? "text-white/80" : "text-[var(--muted)]"}`}>{o.text}</p> : null}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* Kollektion */}
      <section id="kollektion" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6 sm:pt-24">
        <Reveal>
          <p className="text-sm text-[var(--muted)]">{t.sections.collection.eyebrow}</p>
          <h2 className="mt-2 text-4xl sm:text-5xl">{t.sections.collection.title}</h2>
        </Reveal>
        {textil.length ? (
          <div id="textil" className="scroll-mt-20">
            <h3 className="mt-12 text-xl">{t.sections.textil}</h3>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {textil.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 80}>
                  <ProductCard p={p} store={store} lang={lang} t={t} href={href(`/produkt/${p.id}`)} now={now} />
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}
        {druck.length ? (
          <div id="druck" className="scroll-mt-20">
            <h3 className="mt-20 text-xl">{t.sections.druck}</h3>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {druck.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 80}>
                  <ProductCard p={p} store={store} lang={lang} t={t} href={href(`/produkt/${p.id}`)} now={now} />
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Geschichte – hell */}
      <section id="geschichte" className="mx-auto mt-28 max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6">
        <div className="rounded-[2rem] bg-[var(--card)] p-6 ring-1 ring-[var(--line)] sm:p-10 md:p-14">
          <Reveal>
            <p className="ltr-num flex items-center gap-2.5 text-sm text-[var(--muted)]">
              <WavingFlag className="h-4 w-auto" amp={4} dur={3} />
              {s.story.eyebrow[lang]}
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-6xl">{s.story.title[lang]}</h2>
          </Reveal>

          {s.story.images.length ? (
            <div className="mt-12 grid auto-rows-[200px] grid-cols-2 gap-3 sm:auto-rows-[240px] lg:grid-cols-4">
              {s.story.images.slice(0, 6).map((im, i) => (
                <Reveal key={im.url} as="figure" delay={i * 100} className={`group relative overflow-hidden rounded-2xl bg-[var(--paper-2)] ${i === 0 ? "col-span-2 row-span-2" : ""} ${i === 3 ? "lg:col-span-2" : ""}`}>
                  <Image src={im.url} alt={im.caption[lang] || ""} fill sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover transition duration-[1.4s] ease-out group-hover:scale-105" />
                  {im.caption[lang] || im.credit ? (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-sm text-white">
                      {im.caption[lang] ? <span className="block">{im.caption[lang]}</span> : null}
                      {im.credit ? <span className="mt-1 block text-[0.68rem] text-white/60">{im.credit}</span> : null}
                    </figcaption>
                  ) : null}
                </Reveal>
              ))}
            </div>
          ) : null}

          <div className="mt-12 grid gap-10 md:grid-cols-[1.3fr_1fr] md:gap-16">
            <div className="space-y-5 text-lg leading-relaxed text-[#3d3a35]">
              {s.story.paragraphs.map((p, i) => (
                <Reveal key={i} delay={i * 120}>
                  <p>{p[lang]}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <blockquote className="border-s-2 border-[var(--red)] ps-6 text-2xl leading-snug sm:text-3xl">{s.story.quote[lang]}</blockquote>
              <div className="mt-8 flex items-baseline gap-4">
                <span className="ltr-num text-6xl font-medium text-[var(--green)]">8.12</span>
                <span className="ltr-num text-[var(--muted)]">2024 – 2026</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
