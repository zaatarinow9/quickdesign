import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { campaign, isLang, langs, shipping } from "@/lib/shop/config";
import { productBySlug, products } from "@/lib/shop/catalog";
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
  const others = products.filter((x) => x.slug !== p.slug).slice(0, 3);
  const href = (x = "") => `${base}/${lang}${x}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name[lang],
    description: p.description[lang],
    brand: { "@type": "Brand", name: "QuickDesign" },
    offers: { "@type": "Offer", priceCurrency: "EUR", price: (p.priceCents / 100).toFixed(2), availability: "https://schema.org/InStock" },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`${href()}#kollektion`} className="mb-8 inline-flex text-sm text-white/60 hover:text-white">
        {lang === "ar" ? "→" : "←"} {t.product.back}
      </Link>
      <ProductView p={p} taxNote={taxNote} shippingNote={shippingNote} />
      <section className="mt-24">
        <h2 className="mb-8 text-3xl font-semibold tracking-tight">{t.product.more}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((o) => (
            <ProductCard key={o.slug} p={o} lang={lang} href={href(`/produkt/${o.slug}`)} viewLabel={t.grid.view} />
          ))}
        </div>
      </section>
    </div>
  );
}
