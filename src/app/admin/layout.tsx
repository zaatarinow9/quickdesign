import type { Metadata } from "next";
import { arabicFont } from "./fonts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Verwaltung", template: "%s · Verwaltung" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className={`adm ${arabicFont.variable}`}>{children}</div>;
}
