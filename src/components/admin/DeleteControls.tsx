"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, X } from "lucide-react";
import { deleteItems, type DeleteKind } from "@/app/admin/trash-actions";
import { useFeedback } from "./feedback";
import { cn } from "@/lib/utils";

const what: Record<DeleteKind, [string, string]> = {
  datei: ["diese Datei", "Dateien"],
  ordner: ["diesen Ordner", "Ordner"],
  kunde: ["diesen Kunden", "Kunden"],
  auftrag: ["diesen Auftrag", "Aufträge"],
  anfrage: ["diese Anfrage", "Anfragen"],
  dokument: ["dieses Dokument", "Dokumente"],
};

/** Löschen mit Bestätigung + „Rückgängig“ – überall gleich */
export function useDelete() {
  const { confirm, toast } = useFeedback();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = async (o: { kind: DeleteKind; ids: string[]; name?: string; redirectTo?: string; onDone?: () => void }) => {
    if (!o.ids.length) return false;
    const many = o.ids.length > 1;
    const res = await confirm({
      title: many ? `${o.ids.length} ${what[o.kind][1]} löschen?` : `${o.name ? `„${o.name}“` : what[o.kind][0]} löschen?`,
      text: o.kind === "ordner" ? "Mit allen Unterordnern und Dateien." : o.kind === "kunde" ? "Rechnungen bleiben archiviert. Aufträge und Angebote bleiben erhalten." : undefined,
      option: o.kind === "kunde" ? "Ordner und Dateien des Kunden auch löschen" : undefined,
      danger: true,
    });
    if (!res.ok) return false;
    o.onDone?.();
    start(async () => {
      const r = await deleteItems({ kind: o.kind, ids: o.ids, withFiles: res.option });
      if (r.error) toast(r.error, { tone: "error" });
      else toast(r.ok ?? "Gelöscht.", { undo: r.trashIds });
      if (o.redirectTo && !r.error) router.push(o.redirectTo);
    });
    return true;
  };
  return { run, pending };
}

/** Einzelner Löschknopf (Symbol oder Text) */
export function DeleteButton({
  kind,
  id,
  name,
  redirectTo,
  variant = "icon",
  className,
  label = "Löschen",
}: {
  kind: DeleteKind;
  id: string;
  name?: string;
  redirectTo?: string;
  variant?: "icon" | "button" | "menu";
  className?: string;
  label?: string;
}) {
  const { run, pending } = useDelete();
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void run({ kind, ids: [id], name, redirectTo });
  };
  if (variant === "button")
    return (
      <button type="button" onClick={onClick} disabled={pending} className={cn("adm-btn adm-btn-ghost text-red-700 hover:bg-red-50", className)}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />} {label}
      </button>
    );
  if (variant === "menu")
    return (
      <button type="button" onClick={onClick} disabled={pending} className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-red-700 hover:bg-red-50", className)}>
        <Trash2 className="size-4" aria-hidden /> {label}
      </button>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={label}
      aria-label={`${label}${name ? `: ${name}` : ""}`}
      className={cn("grid size-8 place-items-center rounded-lg text-stone-dark transition hover:bg-red-50 hover:text-red-600", className)}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" />}
    </button>
  );
}

/* ------------------------- Mehrfachauswahl in Listen ------------------------- */

type Sel = { kind: DeleteKind; selected: Set<string>; toggle: (id: string) => void; setAll: (ids: string[], on: boolean) => void; clear: () => void; hidden: Set<string>; hide: (ids: string[]) => void };
const SelCtx = createContext<Sel | null>(null);

/** Umschließt eine Liste (Tabelle) – Zeilen mit <RowCheck>, oben <SelectAll>, unten erscheint die Aktionsleiste */
export function Selection({ kind, children }: { kind: DeleteKind; children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const ctx: Sel = {
    kind,
    selected,
    toggle: (id) =>
      setSelected((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    setAll: (ids, on) => setSelected(on ? new Set(ids) : new Set()),
    clear: () => setSelected(new Set()),
    hidden,
    hide: (ids) => setHidden((h) => new Set([...h, ...ids])),
  };
  return (
    <SelCtx.Provider value={ctx}>
      {children}
      <BulkBar />
    </SelCtx.Provider>
  );
}

const useSel = () => useContext(SelCtx);

export function RowCheck({ id, label }: { id: string; label?: string }) {
  const s = useSel();
  if (!s) return null;
  return (
    <input
      type="checkbox"
      aria-label={label ? `${label} auswählen` : "Auswählen"}
      checked={s.selected.has(id)}
      onChange={() => s.toggle(id)}
      onClick={(e) => e.stopPropagation()}
      className="size-4 cursor-pointer accent-[var(--color-accent)]"
    />
  );
}

export function SelectAll({ ids }: { ids: string[] }) {
  const s = useSel();
  if (!s) return null;
  const all = ids.length > 0 && ids.every((i) => s.selected.has(i));
  return <input type="checkbox" aria-label="Alle auswählen" checked={all} onChange={() => s.setAll(ids, !all)} className="size-4 cursor-pointer accent-[var(--color-accent)]" />;
}

/** Zeile ausblenden, sobald sie gelöscht wurde (sofortige Rückmeldung) */
export function Row({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const s = useSel();
  if (s?.hidden.has(id)) return null;
  return <tr className={cn(className, s?.selected.has(id) && "bg-accent/[0.05]")}>{children}</tr>;
}

function BulkBar() {
  const s = useSel();
  const { run, pending } = useDelete();
  if (!s || !s.selected.size) return null;
  const ids = [...s.selected];
  return (
    <div className="qd-pop-in fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-2xl bg-ink py-2 pl-4 pr-2 text-sm text-white shadow-2xl">
        <span className="font-semibold tabular-nums">{ids.length} ausgewählt</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run({
              kind: s.kind,
              ids,
              onDone: () => {
                s.hide(ids);
                s.clear();
              },
            })
          }
          className="ml-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-red-600 px-3.5 font-semibold hover:bg-red-500"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />} Löschen
        </button>
        <button type="button" onClick={s.clear} className="grid size-9 place-items-center rounded-xl text-white/70 hover:bg-white/10" aria-label="Auswahl aufheben">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
