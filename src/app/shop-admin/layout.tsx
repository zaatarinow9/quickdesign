import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Shop-Verwaltung", template: "%s · Shop-Verwaltung" },
  robots: { index: false, follow: false },
};

export default function ShopAdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
