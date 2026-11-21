import type { Metadata } from "next";
import { qatar, qomra } from "../shop/fonts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "لوحة تحكم المتجر", template: "%s · لوحة تحكم المتجر" },
  robots: { index: false, follow: false },
};

export default function ShopAdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`adm shop-adm ${qatar.variable} ${qomra.variable}`} dir="rtl" lang="ar">
      <style>{`
        .shop-adm { --font-display: var(--font-qatar), var(--font-qomra), system-ui, sans-serif; }
        .shop-adm, .shop-adm input, .shop-adm select, .shop-adm textarea, .shop-adm button { font-family: var(--font-qomra), system-ui, sans-serif; }
        .shop-adm h1, .shop-adm h2, .shop-adm h3 { font-family: var(--font-qatar), var(--font-qomra), system-ui, sans-serif !important; font-synthesis: none; letter-spacing: 0 !important; }
        .shop-adm .adm-table th, .shop-adm .adm-table td { text-align: right; }
        .shop-adm .ltr { direction: ltr; unicode-bidi: isolate; }
        /* Kräftigeres Erscheinungsbild: Karten mit grünem Akzent, klarere Felder */
        .shop-adm .adm-card { border: 1px solid rgba(5,66,57,.10); box-shadow: 0 1px 2px rgba(5,66,57,.04), 0 10px 30px -22px rgba(5,66,57,.35); border-radius: 18px; }
        .shop-adm .adm-card > header { background: linear-gradient(to left, #f2faf6, #fff); border-bottom-color: rgba(5,66,57,.08) !important; position: relative; }
        .shop-adm .adm-card > header::before { content: ""; position: absolute; inset-block: 12px; inset-inline-start: 0; width: 3px; border-radius: 3px; background: #054239; }
        .shop-adm .adm-card > header h2 { font-weight: 700; font-size: 1.02rem; color: #054239; }
        .shop-adm .adm-label { font-weight: 600; color: #2c3a37; }
        .shop-adm h1 { font-weight: 700 !important; color: #054239; }
        .shop-adm .adm-input { border-color: rgba(5,66,57,.16); }
        .shop-adm .adm-input:focus { border-color: #0b6456; box-shadow: 0 0 0 3px rgba(11,100,86,.15); outline: none; }
        .shop-adm .adm-card :where(div, label) { min-width: 0; }
      `}</style>
      {children}
    </div>
  );
}
