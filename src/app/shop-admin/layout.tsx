import type { Metadata } from "next";
import { qomra } from "../shop/fonts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "لوحة تحكم المتجر", template: "%s · لوحة تحكم المتجر" },
  robots: { index: false, follow: false },
};

export default function ShopAdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`adm shop-adm ${qomra.variable}`} dir="rtl" lang="ar">
      <style>{`
        .shop-adm, .shop-adm input, .shop-adm select, .shop-adm textarea, .shop-adm button { font-family: var(--font-qomra), system-ui, sans-serif; }
        .shop-adm h1, .shop-adm h2 { font-family: var(--font-qomra), system-ui, sans-serif !important; }
        .shop-adm .adm-table th, .shop-adm .adm-table td { text-align: right; }
        .shop-adm .ltr { direction: ltr; unicode-bidi: isolate; }
      `}</style>
      {children}
    </div>
  );
}
