"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BadgePercent, ExternalLink, Images, KeyRound, LayoutDashboard, LogOut, Menu, Package, ShoppingBag, Truck, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof Package; exact?: boolean; badge?: number };

export function ShopSidebar({ base, email, openOrders, shopUrl, signOut }: { base: string; email: string; openOrders: number; shopUrl: string; signOut: () => Promise<void> }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  // intern immer /shop-admin – für die Markierung beide Varianten vergleichen
  const path = pathname.replace(/^\/shop-admin/, base);
  const items: { title: string; items: Item[] }[] = [
    { title: "", items: [{ href: base, label: "نظرة عامة", icon: LayoutDashboard, exact: true }] },
    {
      title: "المبيعات",
      items: [
        { href: `${base}/bestellungen`, label: "الطلبات", icon: ShoppingBag, badge: openOrders },
        { href: `${base}/produkte`, label: "المنتجات والأسعار", icon: Package },
        { href: `${base}/angebote`, label: "العروض والخصومات", icon: BadgePercent },
      ],
    },
    {
      title: "الإعدادات",
      items: [
        { href: `${base}/versand`, label: "الشحن والسريع والطلب المسبق", icon: Truck },
        { href: `${base}/inhalte`, label: "الصفحة الرئيسية والحكاية", icon: Images },
        { href: `${base}/konto`, label: "الحساب وكلمة السر", icon: KeyRound },
      ],
    },
  ];
  const isActive = (it: Item) => (it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`));

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="لوحة تحكم المتجر">
      <Link href={`${base}/produkte/neu`} onClick={() => setOpen(false)} className="adm-btn w-full bg-[#b9a779] text-[#1d1f1f] hover:bg-[#cdbb8c]">
        <Package className="size-4" aria-hidden /> منتج جديد
      </Link>
      {items.map((g) => (
        <div key={g.title || "root"}>
          {g.title ? <p className="mb-1.5 px-3 text-[0.7rem] font-medium uppercase tracking-wider text-paper/35">{g.title}</p> : null}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = isActive(it);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn("group flex h-10 items-center gap-3 rounded-lg px-3 text-[0.9rem] transition-colors", active ? "bg-paper/[0.09] text-paper" : "text-paper/60 hover:bg-paper/[0.05] hover:text-paper")}
                  >
                    <it.icon className={cn("size-[1.1rem] shrink-0", active ? "text-[#b9a779]" : "text-paper/45 group-hover:text-paper/80")} aria-hidden />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.badge ? <span className="rounded-full bg-[#b9a779] px-2 py-0.5 text-[0.7rem] font-semibold text-[#1d1f1f]">{it.badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-paper/10 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#b9a779] text-sm font-semibold text-[#1d1f1f]">{email.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-paper">فريق المتجر</p>
          <p className="truncate text-xs text-paper/45">{email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="grid size-9 place-items-center rounded-lg text-paper/50 hover:bg-paper/10 hover:text-paper" aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <LogOut className="size-4" aria-hidden />
          </button>
        </form>
      </div>
      <a href={shopUrl} target="_blank" rel="noopener" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-paper/45 hover:text-paper">
        <ExternalLink className="size-3.5" aria-hidden /> عرض المتجر
      </a>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-3">
      <Logo className="w-[104px] text-paper" />
      <span className="rounded-md bg-[#b9a779] px-1.5 py-0.5 text-[0.7rem] font-semibold text-[#1d1f1f]">المتجر</span>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-[#054239] px-4 text-paper lg:hidden">
        <Link href={base} aria-label="نظرة عامة">{brand}</Link>
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-lg hover:bg-paper/10" aria-label="فتح القائمة">
          <Menu className="size-5" aria-hidden />
        </button>
      </div>
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-[17rem] flex-col bg-[#054239] text-paper lg:flex">
        <div className="shop-tricolor-adm h-[3px]" aria-hidden />
        <div className="flex h-16 items-center px-5">
          <Link href={base} aria-label="نظرة عامة">{brand}</Link>
        </div>
        {nav}
        {footer}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <button type="button" className="absolute inset-0 bg-ink/50" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[85%] max-w-[19rem] flex-col bg-[#054239] text-paper shadow-2xl">
            <div className="flex h-14 items-center justify-between px-4">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-paper/10" aria-label="إغلاق القائمة">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}
    </>
  );
}
