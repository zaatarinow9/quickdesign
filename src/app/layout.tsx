import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { HIDE_PUBLIC_CHROME_HEADER } from "@/lib/admin/admin-routes";
import ThemeBridge from "@/components/theme/ThemeBridge";
import ThemeScript from "@/components/theme/ThemeScript";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://quickdesign24.de"),
  title: {
    default: "QuickDesign",
    template: "%s | QuickDesign",
  },
  description:
    "QuickDesign begleitet Druck, Werbetechnik und Bestellungen mit klaren Online-Konfiguratoren und sauberem Checkout.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const hidePublicChrome = requestHeaders.get(HIDE_PUBLIC_CHROME_HEADER) === "1";

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.className} flex min-h-screen flex-col overflow-x-hidden bg-slate-50 text-slate-950`}
      >
        <ThemeBridge />
        {hidePublicChrome ? null : <Header />}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        {hidePublicChrome ? null : <Footer />}
      </body>
    </html>
  );
}
