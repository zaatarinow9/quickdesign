import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dirOf, isLang, langs, SHOP_URL } from "@/lib/shop/config";
import { dict } from "@/lib/shop/i18n";
import { shopBase } from "@/lib/shop/server";
import { thmanyah } from "../fonts";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { CartDrawer } from "@/components/shop/CartDrawer";
import "../shop.css";

export function generateStaticParams() {
  return langs.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict[lang];
  return {
    metadataBase: new URL(SHOP_URL),
    title: { default: t.meta.title, template: `%s | QuickDesign Shop` },
    description: t.meta.description,
    alternates: { canonical: `/${lang}`, languages: { de: "/de", ar: "/ar", "x-default": "/de" } },
    openGraph: { type: "website", locale: lang === "ar" ? "ar_SY" : "de_DE", siteName: "QuickDesign Shop", title: t.meta.title, description: t.meta.description, url: `${SHOP_URL}/${lang}` },
  };
}

export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const base = await shopBase();
  const t = dict[lang];
  return (
    <div lang={lang} dir={dirOf(lang)} className={`shop-root ${thmanyah.variable} min-h-screen bg-[#0a0c0b] text-white antialiased`}>
      <ShopProvider lang={lang} base={base} t={t}>
        <ShopHeader />
        <main>{children}</main>
        <ShopFooter t={t} base={base} lang={lang} />
        <CartDrawer />
      </ShopProvider>
    </div>
  );
}
