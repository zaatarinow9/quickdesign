import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PaymentLogos } from "./PaymentLogos";
import type { Lang } from "@/lib/shop/config";
import type { ShopDict } from "@/lib/shop/i18n";

export function ShopFooter({ t, base, lang, whatsapp }: { t: ShopDict; base: string; lang: Lang; whatsapp: string }) {
  const h = (p: string) => `${base}/${lang}${p}`;
  const main = "https://quickdesign24.de";
  const ar = lang === "ar";
  const a = "hover:text-[var(--green)]";
  const phone = `+${whatsapp.replace(/^49/, "49 ")}`;
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-2)] text-sm text-[var(--muted)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo className="w-[120px] text-[var(--ink)]" />
          <p className="mt-4 max-w-xs leading-relaxed">
            {ar
              ? "مجموعة الذكرى الثانية لتحرير سوريا."
              : "Die Kollektion zum zweiten Jahrestag der Befreiung Syriens – gestaltet und gedruckt von QuickDesign in Saarbrücken."}
          </p>
          <div className="shop-tricolor mt-5 h-1 w-24 rounded-full ring-1 ring-[var(--line)]" />
        </div>
        <div>
          <p className="mb-4 font-bold text-[var(--ink)]">{ar ? "روابط مهمة" : t.footer.legal}</p>
          <ul className="space-y-2.5">
            <li><Link href={h("/hikaya")} className={a}>{ar ? "الحكاية" : "Geschichte"}</Link></li>
            <li><Link href={h("/versand")} className={a}>{t.footer.versand}</Link></li>
            <li><Link href={h("/agb")} className={a}>{t.footer.agb}</Link></li>
            {/* Pflichtangabe nach deutschem Recht (Fernabsatz) – nicht entfernen */}
            <li><Link href={h("/widerruf")} className={a}>{t.footer.widerruf}</Link></li>
            <li><a href={`${main}/impressum`} className={a}>{t.footer.impressum}</a></li>
            <li><a href={`${main}/datenschutz`} className={a}>{t.footer.datenschutz}</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 font-bold text-[var(--ink)]">{ar ? "تواصل معنا" : "Kontakt"}</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-2.5">
              <MessageCircle className="size-4 text-[var(--gold)]" />
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener" className={`ltr-num ${a}`}>{phone}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 text-[var(--gold)]" />
              <a href={`tel:+${whatsapp}`} className={`ltr-num ${a}`}>{phone}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 text-[var(--gold)]" />
              <a href="mailto:info@quickdesign24.de" className={a}>info@quickdesign24.de</a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold)]" />
              <span>Richard-Wagner-Straße 73–75, 66111 Saarbrücken</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs sm:flex-row sm:px-6">
          <span>© 2026 QuickDesign</span>
          <PaymentLogos />
        </div>
      </div>
    </footer>
  );
}
