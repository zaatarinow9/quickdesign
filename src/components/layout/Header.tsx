"use client";

import { ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MAIN_NAV } from "@/data/mock";
import { useCartStore } from "@/lib/store/cart";

export default function Header() {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/88 backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            QuickDesign
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
            aria-label="Warenkorb öffnen"
          >
            <ShoppingCart className="h-5 w-5" />
            {mounted && items.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] font-semibold text-white">
                {items.length}
              </span>
            )}
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
            aria-label="Admin Login"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
