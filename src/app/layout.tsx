import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <Header />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
