import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/actions/auth";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import { AdminBadge, getAdminButtonClassName } from "@/components/admin/AdminUI";
import LogoMark from "@/components/layout/LogoMark";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { requireAdminUser } from "@/lib/admin/auth";
import type { AdminNavItem } from "@/lib/admin/navigation";
import {
  canViewAppointments,
  hasAdminPermission,
} from "@/lib/admin/permissions";

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
  const canSeeAppointments = canViewAppointments(currentUser);
  const canViewCustomers = hasAdminPermission(currentUser, "canViewCustomers");
  const canViewReports = hasAdminPermission(currentUser, "canViewReports");
  const navItems: AdminNavItem[] = [
    {
      href: "/admin",
      label: "Übersicht",
      iconName: "dashboard",
    },
    {
      href: "/admin/orders",
      label: "Bestellungen",
      iconName: "orders",
    },
  ];

  if (canSeeAppointments) {
    navItems.push({
      href: "/admin/appointments",
      label: "Termine",
      iconName: "appointments",
    });
  }

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
      label: "Auswertungen",
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
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden overflow-hidden border-r border-slate-200/80 bg-white/88 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex h-full min-h-0 flex-col px-5 py-6">
            <div className="shrink-0 space-y-6">
              <LogoMark href="/" size="sidebar" />

              <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white shadow-lg ring-1 ring-white/10">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                  Admin-Bereich
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  Interne Verwaltung
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Aufträge, Leistungen und Team in einer ruhigen, gut lesbaren
                  Arbeitsoberfläche.
                </p>
              </div>
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
              <AdminSidebarNav items={navItems} />
            </div>

            <div className="mt-6 shrink-0 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs font-medium tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Angemeldet als
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950 dark:text-slate-50">
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
          </div>
        </aside>

        <div className="min-w-0">
          <div className="border-b border-slate-200/80 bg-white/92 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 lg:hidden">
            <div className="admin-container py-4">
              <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-5 text-white ring-1 ring-white/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <LogoMark href="/" size="compact" />
                    <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-slate-300">
                      Admin-Bereich
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      Interne Verwaltung
                    </p>
                  </div>
                  <ThemeToggle className="bg-white/10 text-white dark:bg-white/10 dark:text-white" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminBadge tone="blue">{currentUser.name}</AdminBadge>
                  <AdminBadge tone="slate">{currentUser.role}</AdminBadge>
                </div>
              </div>

              <div className="mt-4">
                <AdminSidebarNav items={navItems} orientation="horizontal" />
              </div>
            </div>
          </div>

          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
            <div className="admin-container py-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <LogoMark href="/" size="compact" className="hidden xl:inline-flex" />
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Interne Verwaltung
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      Klarere Status, großzügigere Container und konsistente
                      Karten für die tägliche Pflege.
                    </p>
                  </div>
                </div>
                <div className="hidden items-center gap-3 lg:flex">
                  <ThemeToggle />
                  <AdminBadge tone="blue">{currentUser.name}</AdminBadge>
                  <AdminBadge tone="slate">{currentUser.role}</AdminBadge>
                </div>
              </div>
            </div>
          </header>

          <main className="admin-container min-w-0 overflow-x-hidden py-6 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
