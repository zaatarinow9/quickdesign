"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Folder, Search } from "lucide-react";
import { updateFiles } from "@/app/admin/file-actions";
import { fileStatuses, fileStatusInfo, nextFileStatus, type FileStatus, type StoredFile } from "@/lib/files/shared";
import { FileIcon } from "./FileIcon";
import { cn } from "@/lib/utils";

const DND = "application/x-qd-file";

const berlinDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(d);
function since(iso: string | null | undefined) {
  if (!iso) return "";
  const days = Math.round((new Date(`${berlinDay(new Date())}T12:00:00Z`).getTime() - new Date(`${berlinDay(new Date(iso))}T12:00:00Z`).getTime()) / 864e5);
  return days <= 0 ? "seit heute" : days === 1 ? "seit gestern" : `seit ${days} Tagen`;
}

/** Ablauf-Tafel: jede Spalte eine Phase – Karten per Klick oder Ziehen weiterschieben */
export function FileBoard({ files, thumbs, me }: { files: StoredFile[]; thumbs: Record<string, string>; me: string }) {
  const [pending, start] = useTransition();
  const [over, setOver] = useState<FileStatus | null>(null);
  const [q, setQ] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  // Optimistische Anzeige während des Speicherns
  const [moved, setMoved] = useState<Record<string, FileStatus>>({});

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return files
      .map((f) => (moved[f.id] ? { ...f, status: moved[f.id] } : f))
      .filter((f) => (!t || `${f.name} ${f.folder} ${f.category ?? ""} ${f.uploaded_by ?? ""}`.toLowerCase().includes(t)) && (!onlyMine || f.assigned_to === me));
  }, [files, moved, q, onlyMine, me]);

  const move = (id: string, status: FileStatus) => {
    setMoved((m) => ({ ...m, [id]: status }));
    start(async () => {
      await updateFiles({ ids: [id], status });
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Datei, Ordner, Kategorie …" className="adm-input pl-9" aria-label="Filtern" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="size-4 accent-[var(--color-accent)]" /> nur meine Aufgaben
        </label>
        <span className="text-xs text-stone-dark">Karten in die nächste Spalte ziehen oder „→“ klicken.{pending ? " Speichert …" : ""}</span>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10">
        <div className="grid min-w-[720px] grid-cols-3 gap-4">
          {fileStatuses.map((s) => {
            const col = list.filter((f) => f.status === s);
            return (
              <section
                key={s}
                onDragOver={(e) => {
                  if (!Array.from(e.dataTransfer.types).includes(DND)) return;
                  e.preventDefault();
                  setOver(s);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData(DND);
                  setOver(null);
                  if (id) move(id, s);
                }}
                className={cn("flex min-h-[60vh] flex-col rounded-2xl bg-ink/[0.03] p-2.5 transition-colors", over === s && "bg-accent/[0.08] ring-2 ring-accent")}
              >
                <header className="mb-2.5 flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <span className={cn("size-2.5 rounded-full", fileStatusInfo[s].dot)} /> {fileStatusInfo[s].label}
                  </h2>
                  <span className="text-xs tabular-nums text-stone-dark">{col.length}</span>
                </header>
                <p className="mb-2 px-1 text-[0.7rem] leading-snug text-stone-dark">{fileStatusInfo[s].hint}{s === "erledigt" ? " (14 Tage)" : ""}</p>
                <div className="space-y-2">
                  {col.map((f) => {
                    const next = nextFileStatus(f.status);
                    return (
                      <article
                        key={f.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData(DND, f.id)}
                        className="cursor-grab rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-ink/[0.06] active:cursor-grabbing"
                      >
                        <Link href={`/admin/dateien/${f.id}/ansicht`} className="flex gap-2.5">
                          {thumbs[f.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumbs[f.id]} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-ink/10" />
                          ) : (
                            <FileIcon name={f.name} type={f.content_type} className="size-11 rounded-lg [&>span]:hidden" />
                          )}
                          <span className="min-w-0">
                            <span className="line-clamp-2 break-words text-[0.8rem] font-medium leading-snug hover:text-accent">{f.name}</span>
                            <span className="block text-[0.68rem] text-stone-dark">{since(f.status_changed_at ?? f.created_at)}</span>
                          </span>
                        </Link>
                        {f.folder ? (
                          <Link href={`/admin/dateien?ordner=${encodeURIComponent(f.folder)}`} className="mt-1.5 flex items-center gap-1 truncate text-[0.68rem] text-stone-dark hover:text-accent">
                            <Folder className="size-3 shrink-0" aria-hidden /> <span className="truncate">{f.folder}</span>
                          </Link>
                        ) : null}
                        {next ? (
                          <button
                            type="button"
                            onClick={() => move(f.id, next)}
                            className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-ink/[0.04] py-1.5 text-[0.72rem] font-medium hover:bg-ink hover:text-white"
                          >
                            {fileStatusInfo[next].action} <ChevronRight className="size-3" aria-hidden />
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
