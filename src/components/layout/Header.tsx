"use client";

import { PackageSearch, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoMark from "@/components/layout/LogoMark";
import { MAIN_NAV } from "@/data/mock";
import { useCartStore } from "@/lib/store/cart";

function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export default function Header() {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);
  const isTrackingPage = pathname.startsWith("/track");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/92 backdrop-blur-md">
      <div className="public-container py-4">
        <div className="flex items-center justify-between gap-4">
          <LogoMark
            href="/"
            priority
            size="header"
            showLabel
            labelClassName="hidden xl:inline"
          />

          <nav className="hidden items-center gap-2 md:flex">
            {MAIN_NAV.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/cart"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
              aria-label="Warenkorb oeffnen"
            >
              <ShoppingCart className="h-5 w-5" />
              {mounted && items.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] font-semibold text-white">
                  {items.length}
                </span>
              ) : null}
            </Link>
            <Link
              href="/track"
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                isTrackingPage
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950"
              }`}
              aria-label="Auftrag verfolgen"
            >
              <PackageSearch className="h-4 w-4" />
              <span className="hidden sm:inline">Tracking</span>
            </Link>
          </div>
        </div>

        <nav className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
          {MAIN_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
                }`}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
