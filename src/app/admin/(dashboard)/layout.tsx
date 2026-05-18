"use client"

import Link from "next/link";
import { LayoutDashboard, Package, LogOut, ShoppingBag } from "lucide-react";
import { logoutAdmin } from "@/app/actions/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-950">
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col fixed h-full z-10">
        <div className="h-20 flex items-center px-6 border-b border-neutral-200 bg-neutral-950">
          <span className="font-bold text-lg uppercase tracking-widest text-white">QD Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950 transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          
          {/* تم إضافة تبويب الطلبات هنا */}
          <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950 transition-colors">
            <ShoppingBag className="w-4 h-4" /> Bestellungen
          </Link>

          <Link href="/admin/services" className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950 transition-colors">
            <Package className="w-4 h-4" /> Leistungen
          </Link>
        </nav>
        <div className="p-4 border-t border-neutral-200">
          <form action={logoutAdmin}>
            <button type="submit" className="flex items-center gap-3 px-4 py-3 w-full text-left text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" /> Abmelden
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 flex flex-col ml-64">
        <div className="h-20 bg-white border-b border-neutral-200 flex items-center px-10 sticky top-0 z-0">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Übersicht</h2>
        </div>
        <div className="p-10 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}