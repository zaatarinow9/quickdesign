"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages, ShoppingBag } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useShop } from "./ShopProvider";

export function ShopHeader() {
  const { t, href, lang, count, setOpen } = useShop();
  const pathname = usePathname() ?? "";
  // Gleiche Seite in der anderen Sprache
  const other = lang === "de" ? "ar" : "de";
  const switchHref = /\/(de|ar)(\/|$)/.test(pathname) ? pathname.replace(/\/(de|ar)(\/|$)/, `/${other}$2`) : href().replace(`/${lang}`, `/${other}`);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0c0b]/80 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:h-[4.5rem] sm:px-6">
        <Link href={href()} className="flex shrink-0 items-center gap-3" aria-label="QuickDesign Shop">
          <Logo className="w-[108px] sm:w-[128px]" />
          <span className="hidden h-6 w-px bg-white/20 sm:block" />
          <span className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-[var(--shop-gold-2)] sm:block">Shop</span>
        </Link>
        <nav className="ms-auto hidden items-center gap-1 text-sm md:flex" aria-label="Shop">
          <a href={`${href()}#kollektion`} className="rounded-full px-3.5 py-2 text-white/75 hover:bg-white/10 hover:text-white">{t.nav.shop}</a>
          <a href={`${href()}#geschichte`} className="rounded-full px-3.5 py-2 text-white/75 hover:bg-white/10 hover:text-white">{t.nav.story}</a>
          <a href={`${href()}#gruppen`} className="rounded-full px-3.5 py-2 text-white/75 hover:bg-white/10 hover:text-white">{t.nav.groups}</a>
        </nav>
        <div className="ms-auto flex items-center gap-1.5 md:ms-2">
          <Link
            href={switchHref}
            hrefLang={other}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
            style={{ fontFamily: other === "ar" ? "var(--font-ar-display)" : undefined }}
          >
            <Languages className="size-4" aria-hidden /> {t.langSwitch}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative grid size-10 place-items-center rounded-full bg-white text-[#0a0c0b] transition hover:bg-[var(--shop-gold-2)]"
            aria-label={`${t.nav.cart} (${count})`}
          >
            <ShoppingBag className="size-[18px]" aria-hidden />
            {count ? (
              <span className="ltr-num absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[var(--shop-red)] px-1 text-[0.68rem] font-bold text-white ring-2 ring-[#0a0c0b]">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
