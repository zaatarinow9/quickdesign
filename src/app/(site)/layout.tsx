import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import QuickContact from "@/components/layout/QuickContact";
import ScrollProgress from "@/components/layout/ScrollProgress";
import CookieConsent from "@/components/consent/CookieConsent";
import Analytics from "@/components/consent/Analytics";
import MotionProvider from "@/components/motion/MotionProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <ScrollProgress />
      <Header />
      <main id="inhalt" className="relative">
        {children}
      </main>
      <Footer />
      <QuickContact />
      <CookieConsent />
      <Analytics />
    </MotionProvider>
  );
}
