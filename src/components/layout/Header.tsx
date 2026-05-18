"use client"

import Link from "next/link";
import { MAIN_NAV } from "@/data/mock";
import { ShoppingCart, User } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useEffect, useState } from "react";

export default function Header() {
  const items = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="flex h-20 w-full items-center justify-between px-6 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tighter uppercase">QuickDesign</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          {MAIN_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-semibold transition-colors hover:text-neutral-500">
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-6">
          <Link href="/cart" className="relative transition-colors hover:text-neutral-500 flex items-center">
            <ShoppingCart className="h-5 w-5" />
            {mounted && items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-neutral-950 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {items.length}
              </span>
            )}
          </Link>
          <Link href="/admin/login" className="transition-colors hover:text-neutral-500">
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}