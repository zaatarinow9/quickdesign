"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  ExternalLink,
  FilePlus2,
  FileText,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof Inbox; badge?: number; exact?: boolean };
type Group = { title: string; items: Item[] };

function groups(fullAccess: boolean, newInquiries: number): Group[] {
  return [
    { title: "", items: [{ href: "/admin", label: "Übersicht", icon: LayoutDashboard, exact: true }] },
    {
      title: "Vertrieb",
      items: [
        { href: "/admin/anfragen", label: "Anfragen", icon: Inbox, badge: newInquiries },
        { href: "/admin/angebote", label: "Angebote", icon: FileText },
        { href: "/admin/rechnungen", label: "Rechnungen", icon: Receipt },
        { href: "/admin/kunden", label: "Kunden", icon: Users },
      ],
    },
    {
      title: "Marketing",
      items: [
        { href: "/admin/marketing", label: "Kontakte & Einwilligungen", icon: Megaphone, exact: true },
        { href: "/admin/marketing/kampagnen", label: "E-Mail-Kampagnen", icon: FilePlus2 },
        { href: "/admin/statistik", label: "Website-Statistik", icon: BarChart3 },
      ],
    },
    ...(fullAccess
      ? [
          {
            title: "Verwaltung",
            items: [
              { href: "/admin/leistungen", label: "Leistungskatalog", icon: BookOpen },
              { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
              { href: "/admin/benutzer", label: "Benutzer & Rechte", icon: ShieldCheck },
              { href: "/admin/protokoll", label: "Protokoll", icon: History },
            ],
          },
        ]
      : []),
    { title: "Konto", items: [{ href: "/admin/sicherheit", label: "Sicherheit & 2FA", icon: KeyRound }] },
  ];
}

const isActive = (it: Item, p: string) => (it.exact ? p === it.href : p === it.href || p.startsWith(`${it.href}/`));

export function Sidebar({
  fullAccess,
  newInquiries,
  user,
  signOut,
}: {
  fullAccess: boolean;
  newInquiries: number;
  user: { name: string; email: string; role: string };
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Verwaltung">
      <Link href="/admin/angebote/neu" onClick={() => setOpen(false)} className="adm-btn adm-btn-accent w-full">
        <FilePlus2 className="size-4" aria-hidden /> Neues Angebot
      </Link>
      {groups(fullAccess, newInquiries).map((g) => (
        <div key={g.title || "root"}>
          {g.title ? <p className="mb-1.5 px-3 text-[0.7rem] font-medium uppercase tracking-wider text-paper/35">{g.title}</p> : null}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = isActive(it, pathname);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex h-10 items-center gap-3 rounded-lg px-3 text-[0.9rem] transition-colors",
                      active ? "bg-paper/[0.09] text-paper" : "text-paper/60 hover:bg-paper/[0.05] hover:text-paper",
                    )}
                  >
                    <it.icon className={cn("size-[1.1rem] shrink-0", active ? "text-accent" : "text-paper/45 group-hover:text-paper/80")} aria-hidden />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.badge ? <span className="rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-semibold text-white">{it.badge}</span> : null}
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
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
          {(user.name || user.email).slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-paper">{user.name}</p>
          <p className="truncate text-xs text-paper/45">{user.role}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="grid size-9 place-items-center rounded-lg text-paper/50 hover:bg-paper/10 hover:text-paper" aria-label="Abmelden" title="Abmelden">
            <LogOut className="size-4" aria-hidden />
          </button>
        </form>
      </div>
      <a href="/" target="_blank" rel="noopener" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-paper/45 hover:text-paper">
        <ExternalLink className="size-3.5" aria-hidden /> Website ansehen
      </a>
    </div>
  );

  return (
    <>
      {/* Mobil: Kopfleiste */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-ink px-4 text-paper lg:hidden print:hidden">
        <Link href="/admin" aria-label="Übersicht" className="text-paper">
          <Logo className="w-[104px]" />
        </Link>
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-lg hover:bg-paper/10" aria-label="Menü öffnen">
          <Menu className="size-5" aria-hidden />
        </button>
      </div>

      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col bg-ink text-paper lg:flex print:hidden">
        <div className="flex h-16 items-center px-5">
          <Link href="/admin" aria-label="Übersicht" className="text-paper">
            <Logo className="w-[120px]" />
          </Link>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobil: Drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Menü schließen" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-[19rem] flex-col bg-ink text-paper shadow-2xl">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo className="w-[104px]" />
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-paper/10" aria-label="Menü schließen">
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
