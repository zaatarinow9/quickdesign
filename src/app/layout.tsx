import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ThemeBridge from "@/components/theme/ThemeBridge";
import ThemeScript from "@/components/theme/ThemeScript";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Print Studio",
  description: "Hochwertige Druckdienstleistungen und Komplettloesungen",
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
        className={`${inter.className} min-h-screen bg-slate-50 text-slate-950`}
      >
        <ThemeBridge />
        <Header />
        <main className="flex min-h-screen flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
