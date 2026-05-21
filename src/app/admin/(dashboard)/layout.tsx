import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/actions/auth";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
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
  const navItems = [
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
    ...(canViewCustomers
      ? [
          {
            href: "/admin/customers",
            label: "Kunden",
            iconName: "customers" as const,
          },
        ]
      : []),
    ...(canViewReports
      ? [
          {
            href: "/admin/reports",
            label: "Reports",
            iconName: "reports" as const,
          },
        ]
      : []),
    ...(canManageServices
      ? [
          {
            href: "/admin/services",
            label: "Leistungen",
            iconName: "services" as const,
          },
        ]
      : []),
    ...(canManageUsers
      ? [
          {
            href: "/admin/users",
            label: "Team",
            iconName: "users" as const,
          },
        ]
      : []),
  ] satisfies AdminNavItem[];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/70 bg-white/80 px-5 py-6 shadow-xl backdrop-blur lg:flex">
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-300">
            QD Admin
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            Interne Verwaltung
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Auftraege, Services und Team in einer ruhigeren Arbeitsoberflaeche.
          </p>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto">
          <AdminSidebarNav items={navItems} />
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Angemeldet als
          </p>
          <p className="mt-3 text-sm font-bold text-slate-950">
            {currentUser.name}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {currentUser.role}
          </p>
        </div>

        <form action={logoutAdmin} className="mt-4">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-rose-700 transition-colors hover:bg-rose-100"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </form>
      </aside>

      <div className="border-b border-white/70 bg-white/90 px-4 py-4 shadow-sm backdrop-blur lg:hidden">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-300">
              QD Admin
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight">
              Interne Verwaltung
            </p>
          </div>
          <AdminSidebarNav items={navItems} orientation="horizontal" />
        </div>
      </div>

      <main className="lg:ml-72">
        <div className="sticky top-0 z-10 border-b border-white/70 bg-white/80 px-4 py-4 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Interne Verwaltung
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Fokus auf bessere Uebersicht, klare Statusfarben und schnellere Pflege.
              </p>
            </div>
            <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sm:inline-flex">
              {currentUser.name} / {currentUser.role}
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

