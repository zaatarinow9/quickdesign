import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import type { Lang } from "@/lib/shop/config";
import type { ShopDict } from "@/lib/shop/i18n";

export function ShopFooter({ t, base, lang, whatsapp }: { t: ShopDict; base: string; lang: Lang; whatsapp: string }) {
  const h = (p: string) => `${base}/${lang}${p}`;
  const main = "https://quickdesign24.de";
  const a = "hover:text-[var(--ink)]";
  return (
    <footer className="border-t border-[var(--line)] text-sm text-[var(--muted)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo className="w-[120px] text-[var(--ink)]" />
          <p className="mt-4 max-w-xs">{t.footer.note}</p>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--green)] px-4 py-2 text-white hover:brightness-110">
            {t.footer.special}
          </a>
        </div>
        <div>
          <p className="mb-3 font-medium text-[var(--ink)]">{t.footer.legal}</p>
          <ul className="space-y-2">
            <li><Link href={h("/agb")} className={a}>{t.footer.agb}</Link></li>
            <li><Link href={h("/widerruf")} className={a}>{t.footer.widerruf}</Link></li>
            <li><Link href={h("/versand")} className={a}>{t.footer.versand}</Link></li>
            <li><a href={`${main}/impressum`} className={a}>{t.footer.impressum}</a></li>
            <li><a href={`${main}/datenschutz`} className={a}>{t.footer.datenschutz}</a></li>
          </ul>
        </div>
        <div className="space-y-1">
          <p className="mb-3 font-medium text-[var(--ink)]">QuickDesign</p>
          <p>Richard-Wagner-Straße 73–75</p>
          <p>66111 Saarbrücken</p>
          <p className="pt-2"><a href="mailto:info@quickdesign24.de" className={a}>info@quickdesign24.de</a></p>
          <p><a href="tel:+4915772785677" className={`ltr-num ${a}`}>+49 1577 2785677</a></p>
          <p className="pt-2"><a href={main} className="text-[var(--green)] hover:underline">quickdesign24.de</a></p>
        </div>
      </div>
    </footer>
  );
}
