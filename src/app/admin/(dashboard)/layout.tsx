import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/actions/auth";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import { AdminBadge, getAdminButtonClassName } from "@/components/admin/AdminUI";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { requireAdminUser } from "@/lib/admin/auth";
import type { AdminNavItem } from "@/lib/admin/navigation";
import { hasAdminPermission } from "@/lib/admin/permissions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentUser = await requireAdminUser();
  const canManageServices = hasAdminPermission(
    currentUser,
    "canManageServices",
  );
  const canManageUsers = hasAdminPermission(currentUser, "canManageUsers");
  const canViewCustomers = hasAdminPermission(currentUser, "canViewCustomers");
  const canViewReports = hasAdminPermission(currentUser, "canViewReports");
  const navItems: AdminNavItem[] = [
    {
      href: "/admin",
      label: "Dashboard",
      iconName: "dashboard",
    },
    {
      href: "/admin/orders",
      label: "Bestellungen",
      iconName: "orders",
    },
  ];

  if (canViewCustomers) {
    navItems.push({
      href: "/admin/customers",
      label: "Kunden",
      iconName: "customers",
    });
  }

  if (canManageServices) {
    navItems.push({
      href: "/admin/services",
      label: "Leistungen",
      iconName: "services",
    });
  }

  if (canViewReports) {
    navItems.push({
      href: "/admin/reports",
      label: "Reports",
      iconName: "reports",
    });
  }

  if (canManageUsers) {
    navItems.push({
      href: "/admin/users",
      label: "Team",
      iconName: "users",
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fafc_35%,#f8fafc_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,#1e293b_0%,#020617_40%,#020617_100%)] dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-slate-200/80 bg-white/88 px-5 py-6 shadow-xl backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-950/80">
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white shadow-lg ring-1 ring-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            QD Admin
          </p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                Interne Verwaltung
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Bestellungen, Services und Team in einer ruhigeren Arbeitsoberflaeche.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <ThemeToggle />
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <AdminSidebarNav items={navItems} />
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Angemeldet als
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-slate-50">
            {currentUser.name}
          </p>
          <div className="mt-3">
            <AdminBadge tone="slate">{currentUser.role}</AdminBadge>
          </div>
        </div>

        <form action={logoutAdmin} className="mt-4">
          <button type="submit" className={getAdminButtonClassName("danger")}>
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </form>
      </aside>

      <div className="border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 lg:hidden">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-5 text-white ring-1 ring-white/10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                QD Admin
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">
                Interne Verwaltung
              </p>
            </div>
            <ThemeToggle className="bg-white/10 text-white dark:bg-white/10 dark:text-white" />
          </div>
          <AdminSidebarNav items={navItems} orientation="horizontal" />
        </div>
      </div>

      <main className="lg:ml-72">
        <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Interne Verwaltung
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Fokus auf bessere Uebersicht, klare Statusfarben und schnellere Pflege.
              </p>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <AdminBadge tone="blue">{currentUser.name}</AdminBadge>
              <AdminBadge tone="slate">{currentUser.role}</AdminBadge>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

