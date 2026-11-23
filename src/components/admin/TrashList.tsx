"use client";

import { useState, useTransition } from "react";
import { FileText, ListChecks, Folder, Hammer, Inbox, Loader2, RotateCcw, Ruler, Trash2, UserRound, Files } from "lucide-react";
import { purgeItems, restoreItems } from "@/app/admin/trash-actions";
import { useFeedback } from "./feedback";
import { cn } from "@/lib/utils";

type Item = { id: string; kind: string; label: string; detail: string | null; deleted_by: string | null; deleted_at: string; expires: string };

const icon: Record<string, typeof Files> = { dateien: Files, ordner: Folder, kunde: UserRound, auftrag: Hammer, anfrage: Inbox, dokument: FileText, aufmass: Ruler, aufgabe: ListChecks };
const kindName: Record<string, string> = { dateien: "Dateien", ordner: "Ordner", kunde: "Kunde", auftrag: "Auftrag", anfrage: "Anfrage", dokument: "Angebot / Entwurf", aufmass: "Aufmaß", aufgabe: "Aufgabe" };
const fmt = (iso: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5));

export function TrashList({ items, canPurge }: { items: Item[]; canPurge: boolean }) {
  const { confirm, toast } = useFeedback();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const kinds = [...new Set(items.map((i) => i.kind))];
  const shown = items.filter((i) => !gone.has(i.id) && (!filter || i.kind === filter));

  const restore = (id: string) => {
    setBusy(id);
    start(async () => {
      const r = await restoreItems([id]);
      setBusy(null);
      if (r.error) toast(r.error, { tone: "error" });
      else {
        setGone((g) => new Set([...g, id]));
        toast(r.ok ?? "Wiederhergestellt.");
      }
    });
  };
  const purge = async (ids: string[] | "alle", title: string) => {
    const ok = await confirm({ title, text: "Das kann nicht rückgängig gemacht werden.", danger: true, confirm: "Endgültig löschen" });
    if (!ok.ok) return;
    start(async () => {
      const r = await purgeItems(ids);
      if (r.error) toast(r.error, { tone: "error" });
      else {
        setGone((g) => new Set([...g, ...(ids === "alle" ? items.map((i) => i.id) : ids)]));
        toast(r.ok ?? "Gelöscht.");
      }
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/[0.06] px-4 py-3 sm:px-5">
        {["", ...kinds].map((k) => (
          <button key={k || "alle"} type="button" onClick={() => setFilter(k)} className={cn("h-8 rounded-full px-3 text-sm", filter === k ? "bg-ink text-white" : "bg-ink/[0.05] hover:bg-ink/[0.09]")}>
            {k ? kindName[k] : "Alle"}
          </button>
        ))}
        {canPurge && shown.length ? (
          <button type="button" disabled={pending} onClick={() => purge("alle", "Papierkorb leeren?")} className="adm-btn adm-btn-ghost adm-btn-sm ml-auto text-red-700 hover:bg-red-50">
            <Trash2 className="size-4" aria-hidden /> Papierkorb leeren
          </button>
        ) : null}
      </div>
      <ul className="divide-y divide-ink/[0.05]">
        {shown.map((i) => {
          const Icon = icon[i.kind] ?? Files;
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink/[0.05] text-stone-dark">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{i.label}</span>
                <span className="block truncate text-xs text-stone-dark">
                  {kindName[i.kind] ?? i.kind}
                  {i.detail ? ` · ${i.detail}` : ""} · gelöscht {fmt(i.deleted_at)}
                  {i.deleted_by ? ` von ${i.deleted_by}` : ""}
                </span>
              </span>
              <span className="text-xs text-stone-dark">noch {daysLeft(i.expires)} Tage</span>
              <button type="button" disabled={pending} onClick={() => restore(i.id)} className="adm-btn adm-btn-primary adm-btn-sm">
                {busy === i.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />} Wiederherstellen
              </button>
              {canPurge ? (
                <button type="button" disabled={pending} onClick={() => purge([i.id], `„${i.label}“ endgültig löschen?`)} className="grid size-8 place-items-center rounded-lg text-stone-dark hover:bg-red-50 hover:text-red-600" aria-label="Endgültig löschen" title="Endgültig löschen">
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!shown.length ? <p className="px-5 py-10 text-center text-sm text-stone-dark">Nichts mehr hier.</p> : null}
    </div>
  );
}
