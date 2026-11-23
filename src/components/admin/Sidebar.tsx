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
  FolderUp,
  Hammer,
  History,
  Inbox,
  KeyRound,
  ListChecks,
  Trash2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Receipt,
  Search,
  UserPlus,
  Ruler,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { openSearch } from "./CommandPalette";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof Inbox; badge?: number; exact?: boolean };
type Group = { title: string; items: Item[] };

function groups(fullAccess: boolean, newInquiries: number, openTasks: number): Group[] {
  return [
    { title: "", items: [{ href: "/admin", label: "Übersicht", icon: LayoutDashboard, exact: true }] },
    {
      title: "Kunden & Aufträge",
      items: [
        { href: "/admin/anfragen", label: "Anfragen", icon: Inbox, badge: newInquiries },
        { href: "/admin/kunden", label: "Kunden", icon: Users },
        { href: "/admin/aufgaben", label: "Aufgaben", icon: ListChecks, badge: openTasks },
        { href: "/admin/aufmass", label: "Aufmaß", icon: Ruler },
        { href: "/admin/projekte", label: "Aufträge & Termine", icon: Hammer },
      ],
    },
    {
      title: "Produktion",
      items: [
        { href: "/admin/dateien", label: "Dateien", icon: FolderUp },
        { href: "/admin/shop", label: "Shop-Bestellungen", icon: ShoppingBag },
      ],
    },
    {
      title: "Finanzen",
      items: [
        { href: "/admin/angebote", label: "Angebote", icon: FileText },
        { href: "/admin/rechnungen", label: "Rechnungen", icon: Receipt },
      ],
    },
    {
      title: "Marketing",
      items: [
        { href: "/admin/marketing", label: "Newsletter-Kontakte", icon: Megaphone, exact: true },
        { href: "/admin/marketing/kampagnen", label: "Newsletter senden", icon: FilePlus2 },
        { href: "/admin/statistik", label: "Besucher", icon: BarChart3 },
      ],
    },
    ...(fullAccess
      ? [
          {
            title: "Verwaltung",
            items: [
              { href: "/admin/leistungen", label: "Leistungen & Preise", icon: BookOpen },
              { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
              { href: "/admin/benutzer", label: "Mitarbeiter", icon: ShieldCheck },
              { href: "/admin/protokoll", label: "Protokoll", icon: History },
            ],
          },
        ]
      : []),
    {
      title: "Konto",
      items: [
        { href: "/admin/papierkorb", label: "Papierkorb", icon: Trash2 },
        { href: "/admin/sicherheit", label: "Passwort & Sicherheit", icon: KeyRound },
      ],
    },
  ];
}

const isActive = (it: Item, p: string) => (it.exact ? p === it.href : p === it.href || p.startsWith(`${it.href}/`));

export function Sidebar({
  fullAccess,
  newInquiries,
  openTasks = 0,
  user,
  signOut,
}: {
  fullAccess: boolean;
  newInquiries: number;
  openTasks?: number;
  user: { name: string; email: string; role: string };
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Verwaltung">
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          openSearch();
        }}
        className="flex h-10 w-full items-center gap-2.5 rounded-xl bg-paper/[0.07] px-3 text-sm text-paper/60 ring-1 ring-paper/10 transition hover:bg-paper/[0.1] hover:text-paper"
      >
        <Search className="size-4" aria-hidden /> <span className="flex-1 text-left">Suchen …</span>
        <kbd className="rounded bg-paper/10 px-1.5 text-[0.68rem]">Strg K</kbd>
      </button>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            ["/admin/kunden/neu", UserPlus, "Kunde"],
            ["/admin/aufmass/neu", Ruler, "Aufmaß"],
            ["/admin/angebote/neu", FilePlus2, "Angebot"],
          ] as const
        ).map(([href, Icon, label]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)} className="flex flex-col items-center gap-1 rounded-xl bg-accent/90 py-2 text-[0.72rem] font-semibold text-white transition hover:bg-accent" title={`Neu: ${label}`}>
            <Icon className="size-4" aria-hidden /> + {label}
          </Link>
        ))}
      </div>
      {groups(fullAccess, newInquiries, openTasks).map((g) => (
        <div key={g.title || "root"}>
          {g.title ? <p className="mb-1.5 px-3 text-[0.7rem] font-medium uppercase tracking-wider text-paper/35">{g.title}</p> : null}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = isActive(it, pathname);
              return (
                <li key={it.href}>
                  <NavLink
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
                  </NavLink>
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
          <p className="truncate text-xs text-paper/45">{user.email}</p>
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
