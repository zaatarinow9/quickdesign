"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { resolveLine, type ResolvedLine } from "@/lib/shop/schema";
import { priceCart } from "@/lib/shop/pricing";
import { money } from "@/lib/shop/format";
import { useShop } from "./ShopProvider";
import { cn } from "@/lib/utils";

export function ShopHeader() {
  const { href, count, setOpen, store, lines, lang } = useShop();
  const pathname = usePathname() ?? "";
  const [menu, setMenu] = useState(false);
  const total = useMemo(() => {
    const rows = lines.map((l) => resolveLine(store, l)).filter((x): x is ResolvedLine => !!x);
    // eslint-disable-next-line react-hooks/purity -- Aktionen hängen vom aktuellen Datum ab
    return rows.length ? priceCart(store, rows, Date.now()).total : 0;
  }, [lines, store]);

  const sections = store.settings.sections;
  const nav = [
    { to: "", label: lang === "ar" ? "الرئيسية" : "Start" },
    ...sections.map((s) => ({ to: `/qism/${s.slug}`, label: s.title[lang] || s.title.de })),
    { to: "/hikaya", label: lang === "ar" ? "الحكاية" : "Geschichte" },
  ];
  const active = (to: string) => (to ? pathname.endsWith(to) : /\/(ar|de)\/?$/.test(pathname));

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={() => setMenu(true)} className="grid size-10 place-items-center rounded-full text-[var(--ink)] hover:bg-[var(--paper-2)] lg:hidden" aria-label="القائمة">
          <Menu className="size-5" strokeWidth={1.7} />
        </button>
        <Link href={href()} className="flex shrink-0 items-center gap-3 text-[var(--ink)]" aria-label="QuickDesign">
          <Logo className="w-[104px]" />
        </Link>
        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="الأقسام">
          {nav.map((n) => (
            <Link
              key={n.to}
              href={href(n.to)}
              className={cn(
                "rounded-full px-3.5 py-2 text-[0.95rem] transition-colors",
                active(n.to) ? "bg-[var(--mint)] text-[var(--green)]" : "text-[var(--muted)] hover:text-[var(--green)]",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ms-auto flex h-11 items-center gap-2.5 rounded-full border border-[var(--line)] ps-4 pe-1.5 text-[var(--ink)] transition-colors hover:border-[var(--green)] lg:ms-0"
          aria-label={`السلة (${count})`}
        >
          <span className="ltr-num text-sm font-medium">{money(total)}</span>
          <span className="relative grid size-8 place-items-center rounded-full bg-[var(--green)] text-white">
            <ShoppingBag className="size-4" strokeWidth={1.8} />
            {count ? (
              <span className="ltr-num absolute -end-1 -top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-[var(--red)] px-1 text-[0.62rem] font-bold leading-[1.1rem] text-white ring-2 ring-white">
                {count}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {menu ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/30" aria-label="إغلاق" onClick={() => setMenu(false)} />
          <nav className="absolute inset-y-0 start-0 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl">
            <div className="flex h-[4.5rem] items-center justify-between border-b border-[var(--line)] px-4">
              <Logo className="w-[96px] text-[var(--ink)]" />
              <button type="button" onClick={() => setMenu(false)} className="grid size-10 place-items-center rounded-full hover:bg-[var(--paper-2)]" aria-label="إغلاق">
                <X className="size-5" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-3">
              {nav.map((n) => (
                <li key={n.to}>
                  <Link
                    href={href(n.to)}
                    onClick={() => setMenu(false)}
                    className={cn("block rounded-xl px-4 py-3.5 text-lg", active(n.to) ? "bg-[var(--mint)] text-[var(--green)]" : "text-[var(--ink)] hover:bg-[var(--paper-2)]")}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="shop-tricolor h-1" />
          </nav>
        </div>
      ) : null}
    </header>
  );
}
