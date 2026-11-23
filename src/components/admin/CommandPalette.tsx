"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, FilePlus2, FileText, Folder, FolderUp, Hammer, Inbox, Loader2, Receipt, Ruler, Search, Trash2, UserPlus, Users, type LucideIcon } from "lucide-react";
import { globalSearch, type SearchHit } from "@/app/admin/search-actions";
import { cn } from "@/lib/utils";

const actions: (SearchHit & { icon: LucideIcon })[] = [
  { group: "Schnell anlegen", title: "Neuer Kunde", href: "/admin/kunden/neu", icon: UserPlus },
  { group: "Schnell anlegen", title: "Neues Aufmaß", href: "/admin/aufmass/neu", icon: Ruler },
  { group: "Schnell anlegen", title: "Neues Angebot", href: "/admin/angebote/neu", icon: FilePlus2 },
  { group: "Schnell anlegen", title: "Dateien hochladen", href: "/admin/dateien", icon: FolderUp },
  { group: "Gehe zu", title: "Kunden", href: "/admin/kunden", icon: Users },
  { group: "Gehe zu", title: "Aufmaß", href: "/admin/aufmass", icon: Ruler },
  { group: "Gehe zu", title: "Aufträge & Termine", href: "/admin/projekte", icon: Hammer },
  { group: "Gehe zu", title: "Anfragen", href: "/admin/anfragen", icon: Inbox },
  { group: "Gehe zu", title: "Rechnungen", href: "/admin/rechnungen", icon: Receipt },
  { group: "Gehe zu", title: "Papierkorb", href: "/admin/papierkorb", icon: Trash2 },
];
const groupIcon: Record<string, LucideIcon> = { Kunden: Users, Aufmaße: Ruler, Aufträge: Hammer, "Angebote & Rechnungen": FileText, Ordner: Folder, Dateien: FileText, Anfragen: Inbox };

export const openSearch = () => window.dispatchEvent(new Event("qd:search"));

/** Globale Suche: Strg/⌘ + K oder „/“ */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("qd:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("qd:search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await globalSearch(term);
      if (id === seq.current) {
        setHits(r);
        setSel(0);
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const acts = actions.filter((a) => !term || a.title.toLowerCase().includes(term));
    return term.length >= 2 ? [...hits.map((h) => ({ ...h, icon: groupIcon[h.group] ?? FileText })), ...acts] : acts;
  }, [q, hits]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    setHits([]);
    router.push(href);
  };

  if (!open) return null;
  return (
    <div className="qd-fade-in fixed inset-0 z-[90] flex items-start justify-center bg-ink/45 p-3 pt-[10vh] backdrop-blur-[3px]" onMouseDown={() => setOpen(false)}>
      <div className="qd-pop-in w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-ink/10" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Suchen">
        <div className="flex items-center gap-3 border-b border-ink/[0.07] px-4">
          {loading ? <Loader2 className="size-5 animate-spin text-stone" aria-hidden /> : <Search className="size-5 text-stone" aria-hidden />}
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") (e.preventDefault(), setSel((s) => Math.min(list.length - 1, s + 1)));
              else if (e.key === "ArrowUp") (e.preventDefault(), setSel((s) => Math.max(0, s - 1)));
              else if (e.key === "Enter" && list[sel]) go(list[sel].href);
            }}
            placeholder="Kunde, Datei, Ordner, Auftrag, Rechnung, Aufmaß …"
            className="h-14 flex-1 bg-transparent text-base outline-none"
            aria-label="Suchbegriff"
          />
          <kbd className="hidden rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[0.7rem] text-stone-dark sm:inline">ESC</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2">
          {list.map((h, i) => {
            const head = i === 0 || list[i - 1].group !== h.group ? h.group : null;
            return (
              <li key={`${h.href}-${i}`}>
                {head ? <p className="px-3 pb-1 pt-3 text-[0.68rem] font-semibold uppercase tracking-wider text-stone">{head}</p> : null}
                <button
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(h.href)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", sel === i ? "bg-accent/[0.08]" : "hover:bg-ink/[0.03]")}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", sel === i ? "bg-accent text-white" : "bg-ink/[0.05] text-stone-dark")}>
                    <h.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{h.title}</span>
                    {h.sub ? <span className="block truncate text-xs text-stone-dark">{h.sub}</span> : null}
                  </span>
                  {sel === i ? <CornerDownLeft className="size-4 text-stone" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
          {q.trim().length >= 2 && !loading && !hits.length ? <li className="px-3 py-6 text-center text-sm text-stone-dark">Nichts gefunden für „{q}“.</li> : null}
        </ul>
      </div>
    </div>
  );
}
