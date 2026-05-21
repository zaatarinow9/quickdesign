"use client";

import {
  BarChart3,
  LayoutDashboard,
  Package,
  ShoppingBag,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import type { AdminNavIconName, AdminNavItem } from "@/lib/admin/navigation";

type AdminSidebarNavProps = {
  items: AdminNavItem[];
  orientation?: "vertical" | "horizontal";
};

const iconMap: Record<AdminNavIconName, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  customers: UserRound,
  reports: BarChart3,
  services: Package,
  users: Users,
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebarNav({
  items,
  orientation = "vertical",
}: AdminSidebarNavProps) {
  const pathname = usePathname();
  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      className={
        isHorizontal
          ? "flex gap-2 overflow-x-auto pb-1"
          : "flex flex-col gap-2"
      }
    >
      {items.map((item) => {
        const Icon = iconMap[item.iconName];
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] transition-all ${
              active
                ? "bg-slate-950 text-white shadow-lg"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-950"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className={isHorizontal ? "whitespace-nowrap" : ""}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
