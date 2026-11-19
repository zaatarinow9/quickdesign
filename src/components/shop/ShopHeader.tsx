"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useShop } from "./ShopProvider";

export function ShopHeader() {
  const { t, href, lang, count, setOpen } = useShop();
  const pathname = usePathname() ?? "";
  // Gleiche Seite in der anderen Sprache
  const other = lang === "de" ? "ar" : "de";
  const switchHref = /\/(de|ar)(\/|$)/.test(pathname) ? pathname.replace(/\/(de|ar)(\/|$)/, `/${other}$2`) : href().replace(`/${lang}`, `/${other}`);
  const link = "rounded-full px-3 py-2 text-[var(--muted)] transition-colors hover:text-[var(--ink)]";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href={href()} className="flex shrink-0 items-center gap-3 text-[var(--ink)]" aria-label="QuickDesign Shop">
          <Logo className="w-[104px]" />
          <span className="hidden h-5 w-px bg-[var(--line)] sm:block" />
          <span className="ltr-num hidden text-sm text-[var(--muted)] sm:block">8.12.</span>
        </Link>
        <nav className="ms-auto hidden items-center text-[0.95rem] md:flex" aria-label="Shop">
          <a href={`${href()}#textil`} className={link}>{t.nav.textil}</a>
          <a href={`${href()}#druck`} className={link}>{t.nav.druck}</a>
          <a href={`${href()}#gruppen`} className={link}>{t.nav.groups}</a>
        </nav>
        <div className="ms-auto flex items-center gap-1 md:ms-3">
          <Link href={switchHref} hrefLang={other} lang={other} className="rounded-full px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]">
            {t.langSwitch}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative grid size-10 place-items-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--paper-2)]"
            aria-label={`${t.nav.cart} (${count})`}
          >
            <ShoppingBag className="size-5" strokeWidth={1.6} aria-hidden />
            {count ? (
              <span className="ltr-num absolute end-0.5 top-0.5 grid min-w-[1.15rem] place-items-center rounded-full bg-[var(--green)] px-1 text-[0.65rem] font-bold leading-[1.15rem] text-white">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
