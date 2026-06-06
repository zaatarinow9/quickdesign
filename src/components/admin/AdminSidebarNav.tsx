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
import { cn } from "@/lib/utils";

type AdminSidebarNavProps = {
  items: readonly AdminNavItem[];
  orientation?: "vertical" | "horizontal";
};

const iconMap: Record<AdminNavIconName, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  customers: UserRound,
  services: Package,
  reports: BarChart3,
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
      className={cn(
        isHorizontal
          ? "flex gap-2 overflow-x-auto pb-1"
          : "flex flex-col gap-2",
      )}
    >
      {items.map((item) => {
        const Icon = iconMap[item.iconName];
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
              active
                ? "bg-slate-950 text-white shadow-lg ring-1 ring-slate-900/10 dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className={cn("min-w-0", isHorizontal && "whitespace-nowrap")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
