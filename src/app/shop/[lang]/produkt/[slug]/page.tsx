import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLang, SHOP_URL } from "@/lib/shop/config";
import { dict, fill } from "@/lib/shop/i18n";
import { money } from "@/lib/shop/format";
import { shopBase } from "@/lib/shop/server";
import { getStore } from "@/lib/shop/store";
import { activeProducts, fromPrice, imageOf, inScope, offerLive, preorderLive, productById } from "@/lib/shop/schema";
import { getSettings } from "@/lib/settings/server";
import { ProductView } from "@/components/shop/ProductView";
import { ProductCard } from "@/components/shop/ProductCard";

const nowMs = () => Date.now();

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = productById(await getStore(), slug);
  if (!p || !isLang(lang)) return {};
  return {
    title: p.name[lang],
    description: p.description[lang],
    alternates: { canonical: `/${lang}/produkt/${slug}`, languages: { de: `/de/produkt/${slug}`, ar: `/ar/produkt/${slug}` } },
    openGraph: { images: imageOf(p) ? [{ url: imageOf(p), width: 1200, height: 1200 }] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const [store, base, settings] = await Promise.all([getStore(), shopBase(), getSettings()]);
  const p = productById(store, slug);
  if (!p) notFound();
  const t = dict[lang];
  const now = nowMs();
  const s = store.settings;
  // TODO(Inhaber): Kleinunternehmer (§ 19 UStG)? Steuerung über Verwaltung → Einstellungen → Steuer.
  const taxNote = settings.tax.smallBusiness ? t.product.taxSmall : t.product.taxIncl;
  const shippingLines = [
    fill(t.product.shippingText, { std: money(s.shipping.standardCents), days: s.shipping.deliveryDays, free: money(s.shipping.freeFromCents) }),
    s.shipping.express.enabled ? fill(t.product.shippingExpress, { price: money(s.shipping.express.cents), days: s.shipping.express.days }) : "",
    s.shipping.pickup.enabled ? t.product.shippingPickup : "",
  ].filter(Boolean);
  const offerNames = store.offers.filter((o) => offerLive(o, now) && inScope(o.scope, p)).map((o) => o.name[lang]);
  const prePct = preorderLive(s, now) ? s.preorder.pct : 0;
  const all = activeProducts(store);
  const others = [...all.filter((x) => x.id !== p.id && x.category === p.category), ...all.filter((x) => x.category !== p.category)].slice(0, 4);
  const href = (x = "") => `${base}/${lang}${x}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name[lang],
    description: p.description[lang],
    image: imageOf(p) ? `${imageOf(p).startsWith("http") ? "" : SHOP_URL}${imageOf(p)}` : undefined,
    brand: { "@type": "Brand", name: "QuickDesign" },
    offers: { "@type": "Offer", priceCurrency: "EUR", price: (fromPrice(p) / 100).toFixed(2), availability: "https://schema.org/InStock" },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`${href()}#kollektion`} className="mb-6 inline-flex text-sm text-[var(--muted)] hover:text-[var(--ink)]">
        {lang === "ar" ? "→" : "←"} {t.product.back}
      </Link>
      <ProductView p={p} taxNote={taxNote} shippingLines={shippingLines} offerNames={offerNames} prePct={prePct} whatsapp={s.whatsapp} />
      <section className="mt-24">
        <h2 className="mb-8 text-2xl">{t.product.more}</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {others.map((o) => (
            <ProductCard key={o.id} p={o} store={store} lang={lang} t={t} href={href(`/produkt/${o.id}`)} now={now} />
          ))}
        </div>
      </section>
    </div>
  );
}
