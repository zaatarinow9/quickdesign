"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useShop } from "./ShopProvider";
import { cn } from "@/lib/utils";

export function ShopHeader() {
  const { t, href, count, setOpen } = useShop();
  const clear = false;

  const link = cn("rounded-full px-3 py-2 transition-colors", clear ? "text-white/80 hover:text-white" : "text-[var(--muted)] hover:text-[var(--ink)]");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,color] duration-500",
        clear ? "border-b border-transparent bg-transparent text-white" : "border-b border-[var(--line)] bg-[var(--paper)]/90 text-[var(--ink)] backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href={href()} className="flex shrink-0 items-center gap-3" aria-label="QuickDesign Shop">
          <Logo className="w-[104px]" />
          <span className={cn("hidden h-5 w-px sm:block", clear ? "bg-white/30" : "bg-[var(--line)]")} />
          <span className={cn("ltr-num hidden text-sm sm:block", clear ? "text-white/80" : "text-[var(--muted)]")}>8.12.</span>
        </Link>
        <nav className="ms-auto hidden items-center text-[0.95rem] md:flex" aria-label="Shop">
          <a href={`${href()}#kollektion`} className={link}>{t.nav.collection}</a>
          <a href={`${href()}#geschichte`} className={link}>{t.nav.story}</a>
        </nav>
        <div className="ms-auto flex items-center gap-1 md:ms-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn("relative grid size-10 place-items-center rounded-full transition-colors", clear ? "hover:bg-white/10" : "hover:bg-[var(--paper-2)]")}
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
