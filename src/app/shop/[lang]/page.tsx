import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgePercent, ChevronDown, Gift, MapPin, Printer, Store, Truck, Zap } from "lucide-react";
import { daysUntilAnniversary, isLang } from "@/lib/shop/config";
import { dict, fill } from "@/lib/shop/i18n";
import { dateLong, money } from "@/lib/shop/format";
import { shopBase } from "@/lib/shop/server";
import { getStore } from "@/lib/shop/store";
import { activeProducts, categoryKinds, offerLive, preorderLive } from "@/lib/shop/schema";
import { HeroSlider } from "@/components/shop/HeroSlider";
import { CollectionTabs } from "@/components/shop/CollectionTabs";
import { Reveal } from "@/components/shop/Reveal";
import { categoryIcon } from "@/components/shop/ShopIcons";
import { WavingFlag } from "@/components/brand/WavingFlag";

const nowMs = () => Date.now();

export default async function ShopHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ar = lang === "ar";
  const t = dict[lang];
  const [base, store] = await Promise.all([shopBase(), getStore()]);
  const href = (p = "") => `${base}/${lang}${p}`;
  const now = nowMs();
  const s = store.settings;
  const days = daysUntilAnniversary(s.campaign.anniversary, now);
  const live = store.offers.filter((o) => offerLive(o, now));
  const pre = preorderLive(s, now);
  const products = activeProducts(store);
  const sections = s.sections.filter((x) => products.some((p) => categoryKinds[x.slug].includes(p.kind)));

  // Laufband: Angebote und Vorteile
  const promos = [
    pre ? { icon: BadgePercent, text: fill(t.preorder.bar, { pct: s.preorder.pct, date: dateLong(s.preorder.until, lang) }) } : null,
    ...live.map((o) => ({ icon: Gift, text: o.name[lang] || o.name.de })),
    s.shipping.express.enabled ? { icon: Zap, text: fill(t.hero.express, { days: s.shipping.express.days }) } : null,
    s.shipping.freeFromCents ? { icon: Truck, text: ar ? `شحن مجاني للطلبات فوق ${money(s.shipping.freeFromCents)}` : `Kostenloser Versand ab ${money(s.shipping.freeFromCents)}` } : null,
    s.shipping.pickup.enabled ? { icon: Store, text: ar ? "استلام مجاني من محلنا في زاربروكن" : "Kostenlose Abholung in Saarbrücken" } : null,
  ].filter(Boolean) as { icon: typeof Gift; text: string }[];

  const slides = (s.slides.length ? s.slides : [{ image: "/shop/banner-tshirts.webp", title: s.hero.title, text: s.hero.text, link: "" }]).map((sl) => ({
    image: sl.image,
    title: sl.title[lang] || sl.title.de,
    text: sl.text[lang] || sl.text.de,
    href: sl.link?.startsWith("http") ? sl.link : href(sl.link || "#produkte"),
    credit: "credit" in sl ? sl.credit : "",
  }));

  const stats = [
    { icon: Printer, big: "100%", text: ar ? "طباعة في زاربروكن" : "in Saarbrücken gedruckt" },
    s.shipping.express.enabled ? { icon: Zap, big: s.shipping.express.days, text: ar ? "أيام عمل للشحن السريع" : "Werktage Express" } : null,
    s.shipping.freeFromCents ? { icon: Truck, big: money(s.shipping.freeFromCents), text: ar ? "شحن مجاني فوق هذا المبلغ" : "ab hier versandkostenfrei" } : null,
  ].filter(Boolean) as { icon: typeof Printer; big: string; text: string }[];

  const faq = ar
    ? [
        { q: "ما هي طرق الدفع المتاحة؟", a: "يمكنك الدفع بالبطاقة البنكية أو Apple Pay أو Google Pay أو PayPal أو Klarna – بشكل آمن عبر Stripe." },
        {
          q: "كم تستغرق عملية التوصيل؟",
          a: `الشحن العادي ${s.shipping.deliveryDays} أيام عمل داخل ألمانيا${s.shipping.express.enabled ? `، والشحن السريع ${s.shipping.express.days} أيام عمل مقابل ${money(s.shipping.express.cents)}` : ""}.${s.campaign.lastOrderDay ? ` ليصلك الطلب قبل 8 كانون الأول اطلب قبل ${dateLong(s.campaign.lastOrderDay, lang)}.` : ""}`,
        },
        { q: "هل يمكنني استلام الطلب بنفسي؟", a: s.shipping.pickup.enabled ? `نعم، الاستلام مجاني من محلنا: ${s.shipping.pickup.address}. سنبلغك فور جهوز طلبك.` : "حالياً نرسل الطلبات بالشحن فقط." },
        { q: "هل يمكن طلب تصميم خاص أو كمية كبيرة؟", a: "بالتأكيد – راسلنا عبر واتساب ونطبع لك باسم جمعيتك أو شعارك بالكمية التي تريدها." },
      ]
    : [
        { q: "Welche Zahlungsarten gibt es?", a: "Karte, Apple Pay, Google Pay, PayPal und Klarna – sicher über Stripe." },
        { q: "Wie lange dauert die Lieferung?", a: `Standard ${s.shipping.deliveryDays} Werktage, Express ${s.shipping.express.days} Werktage.` },
        { q: "Kann ich abholen?", a: s.shipping.pickup.enabled ? `Ja, kostenlos: ${s.shipping.pickup.address}.` : "Derzeit nur Versand." },
        { q: "Sonderwünsche?", a: "Schreiben Sie uns per WhatsApp." },
      ];

  return (
    <>
      {/* Slider */}
      <HeroSlider slides={slides} cta={t.hero.cta} />

      {/* Grüne Leiste: Countdown und Angebote */}
      <div className="overflow-hidden bg-[var(--green)] py-3 text-sm text-white">
        <div className="marquee flex w-max gap-12 whitespace-nowrap ps-12">
          {[0, 1, 2].map((k) => (
            <span key={k} className="flex items-center gap-12">
              <span className="flex items-center gap-2.5">
                <WavingFlag className="h-3.5 w-auto" amp={4} dur={3} />
                {days > 0 ? fill(t.hero.days, { days }) : t.hero.today}
              </span>
              {promos.map((p, i) => (
                <span key={i} className="flex items-center gap-2">
                  <p.icon className="size-4 text-[var(--gold)]" strokeWidth={1.7} aria-hidden />
                  {p.text}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Bereiche */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <h2 className="text-3xl">{ar ? "الأقسام" : "Bereiche"}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {sections.map((x, i) => {
            const Icon = categoryIcon[x.slug];
            return (
              <Reveal key={x.slug} delay={i * 70}>
                <Link
                  href={href(`/qism/${x.slug}`)}
                  className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-7 text-center transition hover:-translate-y-0.5 hover:border-[var(--green)] hover:shadow-[0_12px_30px_-18px_rgba(5,66,57,0.45)]"
                >
                  <Icon className="size-11 text-[var(--gold)] transition-colors group-hover:text-[var(--green)]" />
                  <span className="font-medium">{x.title[lang] || x.title.de}</span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Produkte */}
      <section id="produkte" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-16 sm:px-6">
        <Reveal>
          <p className="text-sm text-[var(--gold)]">{t.sections.collection.eyebrow}</p>
          <h2 className="mt-1 text-3xl sm:text-4xl">{ar ? "تسوّق المجموعة" : "Die Kollektion"}</h2>
        </Reveal>
        <div className="mt-6">
          <CollectionTabs
            products={[...products.filter((p) => p.featured), ...products.filter((p) => !p.featured)]}
            store={store}
            sections={sections.map((x) => ({ slug: x.slug, title: x.title[lang] || x.title.de }))}
            lang={lang}
            t={t}
            base={base}
            now={now}
          />
        </div>
      </section>

      {/* Geschichte */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <Reveal>
          <div className="grid overflow-hidden rounded-3xl bg-[var(--green)] text-white md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <p className="ltr-num flex items-center gap-2 text-sm text-[var(--mint)]">
                <WavingFlag className="h-3.5 w-auto" amp={4} dur={3} />
                {s.story.eyebrow[lang] || s.story.eyebrow.de}
              </p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">{s.story.title[lang] || s.story.title.de}</h2>
              <p className="mt-4 leading-relaxed text-white/80">{s.story.paragraphs[0]?.[lang]}</p>
              <Link href={href("/hikaya")} className="mt-7 inline-flex h-11 w-fit items-center rounded-full bg-white px-6 font-medium text-[var(--green)] transition-colors hover:bg-[var(--mint)]">
                {ar ? "اقرأ الحكاية" : "Zur Geschichte"}
              </Link>
            </div>
            <div className="relative min-h-[240px]">
              {s.story.image || s.story.images[0]?.url ? (
                <Image src={s.story.image || s.story.images[0].url} alt="" fill sizes="(min-width: 768px) 576px, 100vw" className="object-cover" />
              ) : null}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Zahlen */}
      <section className="mt-20 bg-[var(--paper-2)]">
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-6 px-4 py-14 text-center sm:px-6">
          {stats.map((x) => (
            <Reveal key={x.text}>
              <x.icon className="mx-auto size-8 text-[var(--gold)]" strokeWidth={1.4} />
              <p className="ltr-num mt-3 text-3xl font-bold text-[var(--green)] sm:text-4xl">{x.big}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{x.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Häufige Fragen */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl">{ar ? "الأسئلة الشائعة" : "Häufige Fragen"}</h2>
        <div className="mt-8 space-y-3">
          {faq.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-[var(--line)] bg-white px-5 py-4 open:border-[var(--green)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 leading-relaxed text-[var(--muted)]">{f.a}</p>
            </details>
          ))}
        </div>
        {s.shipping.pickup.enabled ? (
          <p className="mt-8 text-center text-sm text-[var(--muted)]">
            <MapPin className="me-1 inline size-4 text-[var(--gold)]" />
            {s.shipping.pickup.address}
          </p>
        ) : null}
      </section>
    </>
  );
}
