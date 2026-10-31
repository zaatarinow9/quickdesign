import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Outfit } from "next/font/google";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import QuickContact from "@/components/layout/QuickContact";
import ScrollProgress from "@/components/layout/ScrollProgress";
import MotionProvider from "@/components/motion/MotionProvider";
import { site } from "@/content/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap", weight: ["400", "500", "600"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", weight: ["400"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} – Design, Druck & Werbetechnik`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: site.name,
    url: site.url,
    title: `${site.name} – Design, Druck & Werbetechnik`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "light",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  slogan: site.tagline,
  url: site.url,
  logo: `${site.url}/brand/quickdesign-logo.svg`,
  email: site.contact.email,
  telephone: site.contact.phone,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${inter.variable} ${outfit.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <MotionProvider>
          <ScrollProgress />
          <Header />
          <main id="inhalt" className="relative">
            {children}
          </main>
          <Footer />
          <QuickContact />
        </MotionProvider>
      </body>
    </html>
  );
}
