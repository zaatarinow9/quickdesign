import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dirOf, isLang, SHOP_URL } from "@/lib/shop/config";
import { dict, fill } from "@/lib/shop/i18n";
import { shopBase } from "@/lib/shop/server";
import { getStore } from "@/lib/shop/store";
import { preorderLive } from "@/lib/shop/schema";
import { dateLong } from "@/lib/shop/format";
import { qomra } from "../fonts";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { CartDrawer } from "@/components/shop/CartDrawer";
import "../shop.css";

/** Der Shop ist nur auf Arabisch (Deutsch-Texte bleiben im Code als Reserve) */
export function generateStaticParams() {
  return [{ lang: "ar" }];
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict[lang];
  return {
    metadataBase: new URL(SHOP_URL),
    title: { default: t.meta.title, template: `%s | QuickDesign Shop` },
    description: t.meta.description,
    alternates: { canonical: "/ar" },
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
  if (lang !== "ar") redirect(`${base}/ar`);
  const t = dict[lang];
  const pre = store.settings.preorder;
  const showPre = preorderLive(store.settings, nowMs());
  return (
    <div lang={lang} dir={dirOf(lang)} className={`shop-root ${qomra.variable} min-h-screen antialiased`}>
      <div className="shop-tricolor h-[3px]" aria-hidden />
      <div className="border-b border-[var(--line)] bg-[var(--paper-2)] text-xs text-[var(--muted)]">
        <div className="mx-auto flex h-9 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="truncate">
            {showPre ? <span className="font-medium text-[var(--green)]">{fill(t.preorder.bar, { pct: pre.pct, date: pre.until ? dateLong(pre.until, lang) : "" })}</span> : t.footer.note}
          </span>
          <span className="hidden shrink-0 items-center gap-4 sm:flex">
            <a href={`https://wa.me/${store.settings.whatsapp}`} target="_blank" rel="noopener" className="ltr-num hover:text-[var(--green)]">
              +{store.settings.whatsapp.replace(/^49/, "49 ")}
            </a>
            <a href="mailto:info@quickdesign24.de" className="hover:text-[var(--green)]">info@quickdesign24.de</a>
          </span>
        </div>
      </div>
      <ShopProvider lang={lang} base={base} t={t} store={store}>
        <ShopHeader />
        <main>{children}</main>
        <ShopFooter t={t} base={base} lang={lang} whatsapp={store.settings.whatsapp} />
        <CartDrawer />
      </ShopProvider>
    </div>
  );
}
