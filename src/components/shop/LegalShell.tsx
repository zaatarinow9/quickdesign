import type { Lang } from "@/lib/shop/config";

/** Rahmen für Rechtstexte; auf Arabisch mit Hinweis, dass die deutsche Fassung gilt */
export function LegalShell({ lang, title, titleAr, children }: { lang: Lang; title: string; titleAr: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-4xl font-semibold tracking-tight">{lang === "ar" ? titleAr : title}</h1>
      {lang === "ar" ? (
        <p className="mt-6 rounded-2xl bg-[var(--shop-gold)]/10 p-4 text-[var(--shop-gold-2)] ring-1 ring-[var(--shop-gold)]/30">
          النص القانوني متوفر باللغة الألمانية، وهو النص المُلزم. لأي استفسار تواصل معنا على info@quickdesign24.de
        </p>
      ) : null}
      <div dir="ltr" lang="de" className="mt-8 space-y-4 text-start leading-relaxed text-white/75">
        {lang === "ar" ? <h2 className="text-2xl font-semibold text-white">{title}</h2> : null}
        {children}
      </div>
      <p className="mt-12 text-xs text-white/40">Stand: November 2026</p>
    </article>
  );
}
