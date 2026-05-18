import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";
import { logoutAdmin } from "@/app/actions/auth";
import { requireAdminUser } from "@/lib/admin/auth";
import { hasAdminPermission } from "@/lib/admin/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireAdminUser();
  const canManageServices = hasAdminPermission(
    currentUser,
    "canManageServices",
  );
  const canManageUsers = hasAdminPermission(currentUser, "canManageUsers");

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-950">
      <aside className="fixed z-10 flex h-full w-64 flex-col border-r border-neutral-200 bg-white">
        <div className="flex h-20 items-center border-b border-neutral-200 bg-neutral-950 px-6">
          <span className="text-lg font-bold uppercase tracking-widest text-white">
            QD Admin
          </span>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>

          <Link
            href="/admin/orders"
            className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
          >
            <ShoppingBag className="h-4 w-4" /> Bestellungen
          </Link>

          {canManageServices && (
            <Link
              href="/admin/services"
              className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
            >
              <Package className="h-4 w-4" /> Leistungen
            </Link>
          )}

          {canManageUsers && (
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
            >
              <Users className="h-4 w-4" /> Team
            </Link>
          )}
        </nav>
        <div className="space-y-4 border-t border-neutral-200 p-4">
          <div className="rounded-sm bg-neutral-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Angemeldet als
            </p>
            <p className="mt-2 text-sm font-bold text-neutral-950">
              {currentUser.name}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {currentUser.role}
            </p>
          </div>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Abmelden
            </button>
          </form>
        </div>
      </aside>
      <main className="ml-64 flex flex-1 flex-col">
        <div className="sticky top-0 z-0 flex h-20 items-center border-b border-neutral-200 bg-white px-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Interne Verwaltung
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-10">{children}</div>
      </main>
    </div>
  );
}
