"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, History, Loader2 } from "lucide-react";
import { setFileStatus } from "@/app/admin/file-actions";
import { fileStatuses, fileStatusInfo, nextFileStatus, type FileStatus } from "@/lib/files/shared";
import { cn } from "@/lib/utils";

const eventLabel: Record<string, string> = { status: "Status", hochgeladen: "Hochgeladen", verschoben: "Verschoben nach", kategorie: "Kategorie" };
const when = (iso: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));

/** Phasen einer Datei (klickbar) + Verlauf */
export function FileWorkflow({ id, status, events }: { id: string; status: FileStatus; events: { id: number; type: string; note: string | null; actor: string | null; created_at: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState(status);
  const [showLog, setShowLog] = useState(false);
  const idx = fileStatuses.indexOf(current);
  const next = nextFileStatus(current);
  const set = (s: FileStatus) => {
    setCurrent(s);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", s);
    start(async () => {
      await setFileStatus(fd);
      router.refresh();
    });
  };

  return (
    <div className="relative border-b border-white/10 px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <ol className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {fileStatuses.map((s, i) => (
            <li key={s} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => set(s)}
                disabled={pending}
                title={fileStatusInfo[s].hint}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition",
                  i < idx && "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
                  i === idx && "bg-white font-semibold text-ink",
                  i > idx && "text-white/45 hover:bg-white/10 hover:text-white/80",
                )}
              >
                {i < idx ? <Check className="size-3.5" aria-hidden /> : <span className={cn("size-2 rounded-full", fileStatusInfo[s].dot)} />}
                {fileStatusInfo[s].short}
              </button>
              {i < fileStatuses.length - 1 ? <ChevronRight className="size-3.5 text-white/25" aria-hidden /> : null}
            </li>
          ))}
        </ol>
        {next ? (
          <button type="button" onClick={() => set(next)} disabled={pending} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-semibold text-white hover:bg-accent/90">
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Weiter: {fileStatusInfo[next].short}
          </button>
        ) : null}
        <button type="button" onClick={() => setShowLog((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-white/70 hover:bg-white/10" aria-expanded={showLog}>
          <History className="size-3.5" aria-hidden /> Verlauf ({events.length})
        </button>
      </div>
      {showLog ? (
        <div className="absolute right-3 top-full z-30 mt-1 max-h-80 w-[min(92vw,24rem)] overflow-y-auto rounded-xl bg-[#1c1c20] p-2 text-sm shadow-2xl ring-1 ring-white/10">
          {events.length ? (
            <ul>
              {events.map((e) => (
                <li key={e.id} className="rounded-lg px-3 py-2 hover:bg-white/5">
                  <p className="text-white/90">
                    {eventLabel[e.type] ?? e.type}
                    {e.note ? <span className="text-white/60">: {e.note}</span> : null}
                  </p>
                  <p className="text-xs text-white/45">
                    {when(e.created_at)}
                    {e.actor ? ` · ${e.actor}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-white/60">Noch keine Einträge.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
