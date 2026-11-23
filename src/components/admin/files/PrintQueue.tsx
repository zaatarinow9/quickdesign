"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, CheckCheck, Download, Loader2, Printer } from "lucide-react";
import { markPrinted } from "@/app/admin/file-actions";
import { useFeedback } from "@/components/admin/feedback";
import { formatBytes, type StoredFile } from "@/lib/files/shared";
import { cn } from "@/lib/utils";
import { FileIcon } from "./FileIcon";

const time = (iso: string) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso));

/** Warteschlange „Heute drucken“: drucken, abhaken – die Datei wandert automatisch ins Archiv des Tages */
export function PrintQueue({ files, thumbs }: { files: StoredFile[]; thumbs: Record<string, string> }) {
  const { toast } = useFeedback();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const list = files.filter((f) => !gone.has(f.id));

  const done = (ids: string[]) => {
    setBusy(ids.length === 1 ? ids[0] : "alle");
    setGone((g) => new Set([...g, ...ids]));
    setSelected(new Set());
    start(async () => {
      const r = await markPrinted(ids);
      setBusy(null);
      if (r.error) {
        setGone((g) => new Set([...g].filter((x) => !ids.includes(x))));
        toast(r.error, { tone: "error" });
      } else toast(r.ok ?? "Gedruckt.");
    });
  };

  if (!list.length)
    return (
      <div className="grid place-items-center px-6 py-14 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <CheckCheck className="size-7" aria-hidden />
        </span>
        <p className="mt-3 text-lg font-semibold">Alles gedruckt 🎉</p>
        <p className="mt-1 text-sm text-stone-dark">Neue Druckdaten hier hineinziehen – sie erscheinen sofort in der Liste.</p>
      </div>
    );

  const allOn = list.every((f) => selected.has(f.id));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink/[0.06] px-4 py-3 sm:px-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(list.map((f) => f.id)))} className="size-4 accent-[var(--color-accent)]" /> Alle
        </label>
        <span className="text-sm text-stone-dark">
          {list.length} Datei{list.length === 1 ? "" : "en"} warten · {formatBytes(list.reduce((s, f) => s + f.size, 0))}
        </span>
        <button
          type="button"
          disabled={!selected.size || !!busy}
          onClick={() => done([...selected])}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-40"
        >
          {busy === "alle" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCheck className="size-4" aria-hidden />} {selected.size ? `${selected.size} gedruckt` : "Markierte gedruckt"}
        </button>
      </div>
      <ul className="divide-y divide-ink/[0.05]">
        {list.map((f) => (
          <li key={f.id} className={cn("flex items-center gap-3 px-4 py-3 sm:px-5", selected.has(f.id) && "bg-accent/[0.04]")}>
            <input
              type="checkbox"
              checked={selected.has(f.id)}
              onChange={() =>
                setSelected((s) => {
                  const n = new Set(s);
                  if (n.has(f.id)) n.delete(f.id);
                  else n.add(f.id);
                  return n;
                })
              }
              className="size-4 accent-[var(--color-accent)]"
              aria-label={`${f.name} auswählen`}
            />
            <Link href={`/admin/dateien/${f.id}/ansicht`} className="flex min-w-0 flex-1 items-center gap-3">
              {thumbs[f.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbs[f.id]} alt="" loading="lazy" className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-ink/10" />
              ) : (
                <FileIcon name={f.name} type={f.content_type} className="size-14 rounded-xl [&_svg]:size-6" />
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold hover:text-accent">{f.name}</span>
                <span className="block truncate text-xs text-stone-dark">
                  {formatBytes(f.size)} · {time(f.created_at)}
                  {f.uploaded_by ? ` · ${f.uploaded_by}` : ""}
                </span>
                {f.message ? <span className="mt-0.5 block truncate text-xs text-ink/80">💬 {f.message}</span> : null}
              </span>
            </Link>
            <a href={`/admin/dateien/${f.id}`} className="grid size-10 shrink-0 place-items-center rounded-xl text-stone-dark ring-1 ring-ink/10 hover:bg-ink/[0.04]" title="Herunterladen zum Drucken" aria-label="Herunterladen">
              <Download className="size-4" />
            </a>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => done([f.id])}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy === f.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} <span className="hidden sm:inline">Gedruckt</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 border-t border-ink/[0.05] px-5 py-2.5 text-xs text-stone-dark">
        <Printer className="size-3.5" aria-hidden /> „Gedruckt“ verschiebt die Datei in den Ordner des heutigen Drucktages und markiert sie als fertig.
      </p>
    </div>
  );
}
