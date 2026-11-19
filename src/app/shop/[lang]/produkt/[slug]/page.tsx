import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { campaign, isLang, langs, shipping, SHOP_URL } from "@/lib/shop/config";
import { fromPrice, imageOf, productBySlug, products } from "@/lib/shop/catalog";
import { dict, fill } from "@/lib/shop/i18n";
import { dateLong, money } from "@/lib/shop/format";
import { shopBase } from "@/lib/shop/server";
import { getSettings } from "@/lib/settings/server";
import { ProductView } from "@/components/shop/ProductView";
import { ProductCard } from "@/components/shop/ProductCard";

export function generateStaticParams() {
  return langs.flatMap((lang) => products.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = productBySlug(slug);
  if (!p || !isLang(lang)) return {};
  return {
    title: p.name[lang],
    description: p.description[lang],
    alternates: { canonical: `/${lang}/produkt/${slug}`, languages: { de: `/de/produkt/${slug}`, ar: `/ar/produkt/${slug}` } },
    openGraph: { images: [{ url: imageOf(p), width: 1200, height: 1200 }] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const p = productBySlug(slug);
  if (!isLang(lang) || !p) notFound();
  const t = dict[lang];
  const base = await shopBase();
  const settings = await getSettings();
  // TODO(Inhaber): Kleinunternehmer (§ 19 UStG)? Steuerung über Verwaltung → Einstellungen → Steuer.
  const taxNote = settings.tax.smallBusiness ? t.product.taxSmall : t.product.taxIncl;
  const shippingNote = `${fill(t.product.shippingText, { std: money(shipping.standardCents), free: money(shipping.freeFromCents) })}. ${fill(t.hero.lastOrder, { date: dateLong(campaign.lastOrderDay, lang) })}`;
  // Erst gleiche Kategorie, dann Rest
  const others = [...products.filter((x) => x.slug !== p.slug && x.category === p.category), ...products.filter((x) => x.category !== p.category)].slice(0, 4);
  const href = (x = "") => `${base}/${lang}${x}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name[lang],
    description: p.description[lang],
    brand: { "@type": "Brand", name: "QuickDesign" },
    image: `${SHOP_URL}${imageOf(p)}`,
    offers: { "@type": "Offer", priceCurrency: "EUR", price: (fromPrice(p) / 100).toFixed(2), availability: "https://schema.org/InStock" },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`${href()}#${p.category}`} className="mb-6 inline-flex text-sm text-[var(--muted)] hover:text-[var(--ink)]">
        {lang === "ar" ? "→" : "←"} {t.product.back}
      </Link>
      <ProductView p={p} taxNote={taxNote} shippingNote={shippingNote} />
      <section className="mt-24">
        <h2 className="mb-8 text-2xl">{t.product.more}</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {others.map((o) => (
            <ProductCard key={o.slug} p={o} lang={lang} t={t} href={href(`/produkt/${o.slug}`)} />
          ))}
        </div>
      </section>
    </div>
  );
}
