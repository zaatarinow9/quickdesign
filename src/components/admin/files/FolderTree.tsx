"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, ClipboardList, Folder, FolderOpen, HardDrive, Printer, Trash2, UserRound, Users } from "lucide-react";
import { NavLink } from "@/components/admin/NavLink";
import { cn } from "@/lib/utils";

type Node = { name: string; path: string; color: string | null; customer: boolean; children: Node[] };
const href = (p: string) => (p ? `/admin/dateien?ordner=${encodeURIComponent(p)}` : "/admin/dateien");

function build(list: { path: string; color: string | null; customer: boolean }[]): Node[] {
  const root: Node = { name: "", path: "", color: null, customer: false, children: [] };
  const byPath = new Map<string, Node>([["", root]]);
  for (const f of list) {
    const segs = f.path.split("/");
    for (let i = 1; i <= segs.length; i++) {
      const p = segs.slice(0, i).join("/");
      if (byPath.has(p)) continue;
      const parent = byPath.get(segs.slice(0, i - 1).join("/"))!;
      const node: Node = { name: segs[i - 1], path: p, color: null, customer: false, children: [] };
      parent.children.push(node);
      byPath.set(p, node);
    }
    const n = byPath.get(f.path)!;
    n.color = f.color;
    n.customer = f.customer;
  }
  return root.children;
}

/** Ordnerbaum links: Schnellzugriff, Kunden (Jahr → Monat → Kunde), weitere Ordner */
export function FolderTree({ folders, customerRoot, thisMonth, counts }: { folders: { path: string; color: string | null; customer: boolean }[]; customerRoot: string; thisMonth: string; counts: { mine: number; active: number; print?: number } }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = pathname === "/admin/dateien" ? (sp.get("ordner") ?? "") : null;
  const tree = useMemo(() => build(folders), [folders]);
  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set<string>([customerRoot, thisMonth.split("/").slice(0, 2).join("/"), thisMonth]);
    if (current) current.split("/").forEach((_, i, a) => s.add(a.slice(0, i + 1).join("/")));
    return s;
  });
  const toggle = (p: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const quick = [
    { label: "Alle Dateien", href: "/admin/dateien", icon: HardDrive, active: current === "" && !sp.get("q") && !sp.get("fuer") },
    { label: "Kunden – dieser Monat", href: href(thisMonth), icon: Users, active: current === thisMonth },
    { label: "Für mich", href: "/admin/dateien?fuer=mich", icon: UserRound, active: sp.get("fuer") === "mich", count: counts.mine },
    { label: "Heute drucken", href: "/admin/dateien/druck", icon: Printer, active: pathname === "/admin/dateien/druck", count: counts.print },
    { label: "Ablauf (Tafel)", href: "/admin/dateien/ablauf", icon: ClipboardList, active: pathname === "/admin/dateien/ablauf", count: counts.active },
    { label: "Papierkorb", href: "/admin/dateien/papierkorb", icon: Trash2, active: pathname === "/admin/dateien/papierkorb" },
  ];

  const renderNode = (n: Node, depth: number) => {
    const isOpen = open.has(n.path);
    const active = current === n.path;
    const Icon = n.customer ? UserRound : isOpen && n.children.length ? FolderOpen : Folder;
    return (
      <li key={n.path}>
        <div className={cn("group flex items-center rounded-lg pr-1 text-[0.85rem]", active ? "bg-accent/10 font-semibold text-accent" : "hover:bg-ink/[0.04]")} style={{ paddingLeft: depth * 12 }}>
          <button
            type="button"
            onClick={() => toggle(n.path)}
            className={cn("grid size-6 shrink-0 place-items-center rounded text-stone", !n.children.length && "invisible")}
            aria-label={isOpen ? "Zuklappen" : "Aufklappen"}
            aria-expanded={isOpen}
          >
            <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
          </button>
          <NavLink href={href(n.path)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5">
            <Icon className={cn("size-4 shrink-0", n.customer ? "text-sky-600" : "")} style={!n.customer ? { color: n.color ?? "#e0a800" } : undefined} aria-hidden />
            <span className="truncate">{n.name}</span>
          </NavLink>
        </div>
        {isOpen && n.children.length ? <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul> : null}
      </li>
    );
  };

  const customers = tree.find((n) => n.path === customerRoot);
  const others = tree.filter((n) => n.path !== customerRoot);

  return (
    <nav className="space-y-5 text-sm" aria-label="Ordner">
      <ul className="space-y-0.5">
        {quick.map((q) => (
          <li key={q.label}>
            <NavLink href={q.href} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2", q.active ? "bg-ink font-semibold text-white" : "text-stone-dark hover:bg-ink/[0.04] hover:text-ink")}>
              <q.icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{q.label}</span>
              {q.count ? <span className={cn("rounded-full px-1.5 text-[0.7rem] tabular-nums", q.active ? "bg-white/20" : "bg-ink/[0.06]")}>{q.count}</span> : null}
            </NavLink>
          </li>
        ))}
      </ul>
      {customers ? (
        <div>
          <p className="mb-1 px-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-stone">Kunden nach Jahr & Monat</p>
          <ul>{customers.children.map((c) => renderNode(c, 0))}</ul>
        </div>
      ) : null}
      {others.length ? (
        <div>
          <p className="mb-1 px-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-stone">Weitere Ordner</p>
          <ul>{others.map((c) => renderNode(c, 0))}</ul>
        </div>
      ) : null}
    </nav>
  );
}
