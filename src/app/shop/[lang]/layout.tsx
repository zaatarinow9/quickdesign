import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dirOf, isLang, langs, SHOP_URL } from "@/lib/shop/config";
import { dict, fill } from "@/lib/shop/i18n";
import { shopBase } from "@/lib/shop/server";
import { getStore } from "@/lib/shop/store";
import { preorderLive } from "@/lib/shop/schema";
import { dateLong } from "@/lib/shop/format";
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
    openGraph: {
      type: "website",
      locale: lang === "ar" ? "ar_SY" : "de_DE",
      siteName: "QuickDesign Shop",
      title: t.meta.title,
      description: t.meta.description,
      url: `${SHOP_URL}/${lang}`,
      images: [{ url: "/shop/fahne.webp", width: 1200, height: 1200 }],
    },
  };
}

/** Jetzt (ausgelagert, damit Komponenten rein bleiben) */
const nowMs = () => Date.now();

export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [base, store] = await Promise.all([shopBase(), getStore()]);
  const t = dict[lang];
  const pre = store.settings.preorder;
  const showPre = preorderLive(store.settings, nowMs());
  return (
    <div lang={lang} dir={dirOf(lang)} className={`shop-root ${thmanyah.variable} min-h-screen antialiased`}>
      <div className="shop-tricolor h-[3px]" aria-hidden />
      {showPre ? (
        <a href={`${base}/${lang}#kollektion`} className="block bg-[var(--ink)] px-4 py-2 text-center text-[0.82rem] text-white/90 hover:text-white">
          {fill(t.preorder.bar, { pct: pre.pct, date: pre.until ? dateLong(pre.until, lang) : "" })}
        </a>
      ) : null}
      <ShopProvider lang={lang} base={base} t={t} store={store}>
        <ShopHeader />
        <main>{children}</main>
        <ShopFooter t={t} base={base} lang={lang} whatsapp={store.settings.whatsapp} />
        <CartDrawer />
      </ShopProvider>
    </div>
  );
}
