import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import type { Lang } from "@/lib/shop/config";
import type { ShopDict } from "@/lib/shop/i18n";

export function ShopFooter({ t, base, lang }: { t: ShopDict; base: string; lang: Lang }) {
  const h = (p: string) => `${base}/${lang}${p}`;
  const main = "https://quickdesign24.de";
  return (
    <footer className="border-t border-white/10 bg-[#070908] text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo className="w-[150px] text-white" withTagline />
          <p className="mt-4 max-w-sm text-sm">{t.footer.note}</p>
          <div className="mt-5 flex h-1.5 w-40 overflow-hidden rounded-full">
            <span className="flex-1 bg-[var(--shop-green)]" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-black ring-1 ring-white/20" />
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--shop-gold-2)]">{t.footer.legal}</p>
          <ul className="space-y-2 text-sm">
            <li><Link href={h("/agb")} className="hover:text-white">{t.footer.agb}</Link></li>
            <li><Link href={h("/widerruf")} className="hover:text-white">{t.footer.widerruf}</Link></li>
            <li><Link href={h("/versand")} className="hover:text-white">{t.footer.versand}</Link></li>
            <li><a href={`${main}/impressum`} className="hover:text-white">{t.footer.impressum}</a></li>
            <li><a href={`${main}/datenschutz`} className="hover:text-white">{t.footer.datenschutz}</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--shop-gold-2)]">QuickDesign</p>
          <p>Richard-Wagner-Straße 73–75</p>
          <p>66111 Saarbrücken</p>
          <p className="mt-2"><a href="mailto:info@quickdesign24.de" className="hover:text-white">info@quickdesign24.de</a></p>
          <p><a href="tel:+4915772785677" className="ltr-num hover:text-white">+49 1577 2785677</a></p>
          <p className="mt-3"><a href={main} className="text-[var(--shop-gold-2)] hover:underline">quickdesign24.de →</a></p>
        </div>
      </div>
    </footer>
  );
}
