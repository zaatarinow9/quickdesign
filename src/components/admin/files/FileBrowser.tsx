"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Check,
  Download,
  Folder,
  FolderInput,
  FolderPlus,
  LayoutGrid,
  List,
  MoreHorizontal,
  Palette,
  Pencil,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  createFolder,
  deleteFiles,
  deleteFolder,
  downloadList,
  moveFiles,
  moveFolder,
  renameFolder,
  setFolderColor,
  updateFiles,
} from "@/app/admin/file-actions";
import { formatDateTime } from "@/lib/documents/format";
import {
  datePrefix,
  fileCategories,
  fileProgress,
  fileStatusInfo,
  fileStatuses,
  isPrintDayFolder,
  printDayLabel,
  folderColors,
  formatBytes,
  joinFolder,
  sortLabels,
  type FolderEntry,
  type SortKey,
  type StoredFile,
  type ViewMode,
} from "@/lib/files/shared";
import { FileIcon } from "./FileIcon";
import { useFeedback } from "@/components/admin/feedback";
import { canSaveFolders, downloadFolder, type DownloadProgress } from "./download";
import { FileStatusSelect } from "./FileStatusSelect";
import { cn } from "@/lib/utils";

type Props = {
  files: StoredFile[];
  folders: FolderEntry[];
  thumbs: Record<string, string>;
  folder: string;
  flat: boolean;
  initialView: ViewMode;
  initialSort: SortKey;
  allFolders: string[];
  customers: { id: string; label: string }[];
  team: { email: string; name: string }[];
};

const setPref = (k: string, v: string) => {
  document.cookie = `${k}=${encodeURIComponent(v)}; path=/admin; max-age=31536000; samesite=lax`;
};
const folderHref = (p: string) => (p ? `/admin/dateien?ordner=${encodeURIComponent(p)}` : "/admin/dateien");
const ext = (n: string) => n.split(".").pop()?.toLowerCase() ?? "";

function sortFiles(files: StoredFile[], sort: SortKey) {
  const list = [...files];
  const byName = (a: StoredFile, b: StoredFile) => a.name.localeCompare(b.name, "de", { numeric: true });
  switch (sort) {
    case "neu":
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "alt":
      return list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case "groesse":
      return list.sort((a, b) => b.size - a.size);
    case "typ":
      return list.sort((a, b) => ext(a.name).localeCompare(ext(b.name)) || byName(a, b));
    default:
      return list.sort(byName);
  }
}

function sortFolders(folders: FolderEntry[], sort: SortKey) {
  const list = [...folders];
  if (sort === "neu") return list.sort((a, b) => (b.lastUpload ?? "").localeCompare(a.lastUpload ?? "") || a.name.localeCompare(b.name, "de"));
  if (sort === "alt") return list.sort((a, b) => (a.lastUpload ?? "").localeCompare(b.lastUpload ?? "") || a.name.localeCompare(b.name, "de"));
  if (sort === "groesse") return list.sort((a, b) => b.totalSize - a.totalSize);
  return list.sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
}

/* ------------------------------ kleine Bausteine ------------------------------ */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-md hover:bg-ink/[0.06]" aria-label="Schließen">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FolderGlyph({ color, className }: { color: string | null; className?: string }) {
  const c = color ?? "#f2b705";
  return <Folder className={className} style={{ color: c, fill: `${c}33` }} aria-hidden />;
}

/* ------------------------------ Hauptkomponente ------------------------------ */

export function FileBrowser({ files, folders, thumbs, folder, flat, initialView, initialSort, allFolders, customers, team }: Props) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>(initialView);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [category, setCategory] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<null | { type: "neu" } | { type: "verschieben" } | { type: "kategorie" } | { type: "ordner"; f: FolderEntry; mode: "umbenennen" | "verschieben" | "farbe" }>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const { confirm, toast } = useFeedback();
  // Sofort sichtbare Änderungen (optimistisch) – der Server bestätigt im Hintergrund
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [goneFolders, setGoneFolders] = useState<Set<string>>(new Set());
  const [patches, setPatches] = useState<Record<string, Partial<StoredFile>>>({});
  const live = useMemo(
    () => files.filter((f) => !gone.has(f.id)).map((f) => (patches[f.id] ? { ...f, ...patches[f.id] } : f)),
    [files, gone, patches],
  );

  const categories = useMemo(() => [...new Set(live.map((f) => f.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "de")), [live]);
  const shownFiles = useMemo(() => sortFiles(category ? live.filter((f) => f.category === category) : live, sort), [live, sort, category]);
  const shownFolders = useMemo(() => sortFolders(folders.filter((f) => !goneFolders.has(f.path)), sort), [folders, goneFolders, sort]);
  const allSelected = shownFiles.length > 0 && shownFiles.every((f) => selected.has(f.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  // Server-Aktionen aktualisieren die Seite selbst (revalidatePath) – kein zusätzliches refresh nötig
  const run = (fn: () => Promise<{ ok?: string; error?: string } | void>, after?: () => void, undo?: () => void) => {
    after?.();
    start(async () => {
      try {
        const r = await fn();
        const err = r && "error" in r && r.error ? r.error : null;
        if (err) undo?.();
        setMsg(err ?? (r && "ok" in r && r.ok ? r.ok : null));
      } catch {
        undo?.();
        setMsg("Aktion fehlgeschlagen – bitte erneut versuchen.");
      }
    });
  };
  // Herunterladen (Ordner mit Struktur oder Auswahl)
  const [dl, setDl] = useState<(DownloadProgress & { state: "läuft" | "fertig" | "fehler"; error?: string }) | null>(null);
  const dlAbort = useRef<AbortController | null>(null);
  const lastPaint = useRef(0);
  const download = async (input: { folder?: string; ids?: string[] }) => {
    if (dl?.state === "läuft") return;
    const ctrl = new AbortController();
    dlAbort.current = ctrl;
    try {
      await downloadFolder(
        () => {
          setDl({ done: 0, total: 0, bytes: 0, totalBytes: 0, mode: canSaveFolders() ? "ordner" : "zip", state: "läuft" });
          return downloadList(input);
        },
        (p) => {
          const now = Date.now();
          if (now - lastPaint.current < 150 && p.done < p.total) return;
          lastPaint.current = now;
          setDl({ ...p, state: "läuft" });
        },
        ctrl.signal,
      );
      setDl((d) => (d ? { ...d, done: d.total, bytes: d.totalBytes, state: "fertig" } : null));
      setTimeout(() => setDl((d) => (d?.state === "fertig" ? null : d)), 6000);
    } catch (e) {
      // Ordnerauswahl abgebrochen → still beenden
      if (e instanceof DOMException && e.name === "AbortError") return setDl(null);
      setDl((d) => ({ ...(d ?? { done: 0, total: 0, bytes: 0, totalBytes: 0, mode: "ordner" }), state: "fehler", error: e instanceof Error ? e.message : "Download fehlgeschlagen" }));
    }
  };

  /** Dateien sofort ausblenden (Löschen/Verschieben), bei Fehler wieder zeigen */
  const hide = (ids: string[]) => {
    setGone((g) => new Set([...g, ...ids]));
    return () => setGone((g) => new Set([...g].filter((x) => !ids.includes(x))));
  };
  const patch = (ids: string[], p: Partial<StoredFile>) => {
    const before = Object.fromEntries(ids.map((id) => [id, patches[id]]));
    setPatches((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, { ...m[id], ...p }])) }));
    return () => setPatches((m) => ({ ...m, ...before }) as Record<string, Partial<StoredFile>>);
  };
  const removeFolder = async (f: FolderEntry) => {
    const ok = await confirm({ title: `Ordner „${f.name}“ löschen?`, text: `Mit allen Unterordnern und ${f.fileCount} Datei(en).`, danger: true });
    if (!ok.ok) return;
    setGoneFolders((g) => new Set([...g, f.path]));
    const fd = new FormData();
    fd.set("folder", f.path);
    start(async () => {
      const r = await deleteFolder(fd);
      if (r.error) {
        setGoneFolders((g) => new Set([...g].filter((x) => x !== f.path)));
        toast(r.error, { tone: "error" });
      } else toast(r.ok ?? "Gelöscht.", { undo: r.trashIds });
    });
  };
  const removeFiles = async (ids: string[]) => {
    const one = ids.length === 1 ? files.find((f) => f.id === ids[0]) : null;
    const ok = await confirm({ title: one ? `„${one.name}“ löschen?` : `${ids.length} Dateien löschen?`, danger: true });
    if (!ok.ok) return;
    const undo = hide(ids);
    setSelected(new Set());
    start(async () => {
      const r = await deleteFiles(ids);
      if (r.error) {
        undo();
        toast(r.error, { tone: "error" });
      } else toast(r.ok ?? "Gelöscht.", { undo: r.trashIds });
    });
  };

  const nameOf = (email: string | null) => (email ? (team.find((m) => m.email === email)?.name ?? email) : null);

  return (
    <div>
      {/* Werkzeugleiste */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/[0.06] px-4 py-3 sm:px-5">
        {!flat ? (
          <button type="button" onClick={() => setDialog({ type: "neu" })} className="adm-btn adm-btn-ghost adm-btn-sm">
            <FolderPlus className="size-4" aria-hidden /> Neuer Ordner
          </button>
        ) : null}
        {!flat && (files.length || folders.length) ? (
          <button type="button" onClick={() => download({ folder })} className="adm-btn adm-btn-ghost adm-btn-sm" title="Ganzen Ordner mit Unterordnern herunterladen">
            <Download className="size-4" aria-hidden /> {folder ? "Ordner herunterladen" : "Alles herunterladen"}
          </button>
        ) : null}
        {categories.length ? (
          <div className="flex flex-wrap items-center gap-1">
            <Tag className="ml-1 size-3.5 text-stone" aria-hidden />
            {["", ...categories].map((c) => (
              <button
                key={c || "alle"}
                type="button"
                onClick={() => setCategory(c)}
                className={cn("h-7 rounded-full px-2.5 text-xs", category === c ? "bg-ink text-white" : "bg-ink/[0.04] hover:bg-ink/[0.08]")}
              >
                {c || "Alle"}
              </button>
            ))}
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <label className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone" aria-hidden />
            <select
              aria-label="Sortieren"
              value={sort}
              onChange={(e) => {
                const v = e.target.value as SortKey;
                setSort(v);
                setPref("qd_dateien_sort", v);
              }}
              className="adm-input h-8 py-0 pl-8 pr-7 text-xs"
            >
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {sortLabels[k]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex h-8 rounded-lg bg-ink/[0.05] p-0.5" role="group" aria-label="Ansicht">
            {(
              [
                ["raster", LayoutGrid, "Kacheln"],
                ["liste", List, "Liste"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setView(v);
                  setPref("qd_dateien_ansicht", v);
                }}
                aria-pressed={view === v}
                title={label}
                className={cn("grid w-8 place-items-center rounded-md", view === v ? "bg-white shadow-sm" : "text-stone-dark hover:text-ink")}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Auswahl-Leiste */}
      {selected.size ? (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-accent/20 bg-accent/[0.06] px-4 py-2.5 text-sm backdrop-blur sm:px-5">
          <span className="font-semibold">{selected.size} ausgewählt</span>
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm bg-white" onClick={() => download({ ids: [...selected] })}>
            <Download className="size-4" aria-hidden /> Herunterladen
          </button>
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm bg-white" onClick={() => setDialog({ type: "verschieben" })}>
            <FolderInput className="size-4" aria-hidden /> Verschieben
          </button>
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm bg-white" onClick={() => setDialog({ type: "kategorie" })}>
            <Tag className="size-4" aria-hidden /> Kategorie
          </button>
          <select
            aria-label="Status setzen"
            className="adm-input h-8 w-auto py-0 text-xs"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const ids = [...selected];
              const undo = patch(ids, { status: v as StoredFile["status"] });
              run(() => updateFiles({ ids, status: v }), undefined, undo);
            }}
          >
            <option value="">Status setzen …</option>
            {fileStatuses.map((s) => (
              <option key={s} value={s}>
                {fileStatusInfo[s].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm bg-white text-red-700"
            onClick={() => void removeFiles([...selected])}
          >
            <Trash2 className="size-4" aria-hidden /> Löschen
          </button>
          <button type="button" className="ml-auto text-xs text-stone-dark hover:text-ink" onClick={() => setSelected(new Set())}>
            Auswahl aufheben
          </button>
        </div>
      ) : null}
      {msg ? (
        <div className="flex items-center justify-between gap-2 border-b border-ink/[0.06] bg-emerald-50 px-5 py-2 text-sm text-emerald-800">
          {msg}
          <button type="button" onClick={() => setMsg(null)} aria-label="Schließen">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {/* Inhalt */}
      {view === "raster" ? (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {shownFolders.map((f) => (
            <div key={f.path} className="group relative">
              <Link href={folderHref(f.path)} className="flex h-full flex-col items-center gap-2 rounded-2xl p-3 text-center ring-1 ring-transparent transition hover:bg-ink/[0.03] hover:ring-ink/10">
                <FolderGlyph color={f.color} className="size-20 stroke-[1.2]" />
                <span className="line-clamp-2 text-sm font-medium leading-snug">{f.name}</span>
                {isPrintDayFolder(f.path) ? <span className="-mt-1 text-[0.7rem] text-accent">{printDayLabel(f.name).split(",")[0]}</span> : null}
                <span className="text-xs text-stone-dark">
                  {f.fileCount} Datei{f.fileCount === 1 ? "" : "en"}
                  {f.totalSize ? ` · ${formatBytes(f.totalSize)}` : ""}
                </span>
                {f.customerId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[0.7rem] text-sky-700">
                    <UserRound className="size-3" aria-hidden /> Kunde
                  </span>
                ) : null}
              </Link>
              <FolderMenu f={f} onPick={(mode) => setDialog({ type: "ordner", f, mode })} onDelete={() => void removeFolder(f)} onDownload={() => download({ folder: f.path })} />
            </div>
          ))}
          {shownFiles.map((f) => {
            const sel = selected.has(f.id);
            return (
              <div key={f.id} className={cn("group relative flex flex-col rounded-2xl p-2 ring-1 transition", sel ? "bg-accent/[0.06] ring-accent" : "ring-transparent hover:bg-ink/[0.03] hover:ring-ink/10")}>
                <Link href={`/admin/dateien/${f.id}/ansicht`} className="block">
                  <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-[#f1efea]">
                    {thumbs[f.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[f.id]} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <FileIcon name={f.name} type={f.content_type} className="size-16 rounded-2xl [&_svg]:size-8" />
                    )}
                    <span className={cn("absolute bottom-2 right-2 size-2.5 rounded-full ring-2 ring-white", fileStatusInfo[f.status].dot)} title={fileStatusInfo[f.status].label} />
                  </div>
                  <p className="mt-2 line-clamp-2 break-words px-1 text-[0.82rem] font-medium leading-snug" title={f.name}>
                    {f.name}
                  </p>
                  <p className="mt-0.5 px-1 text-[0.7rem] text-stone-dark">
                    {formatDateTime(f.created_at).split(",")[0]} · {formatBytes(f.size)}
                  </p>
                  {f.category || (flat && f.folder) ? (
                    <p className="mt-1 truncate px-1 text-[0.7rem] text-stone-dark">{[f.category, flat ? f.folder : null].filter(Boolean).join(" · ")}</p>
                  ) : null}
                  <div className="mt-1.5 px-1">
                    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[0.66rem] font-medium", fileStatusInfo[f.status].chip)}>{fileStatusInfo[f.status].label}</span>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                      <div className={cn("h-full rounded-full", fileStatusInfo[f.status].bar)} style={{ width: `${Math.max(6, fileProgress(f.status))}%` }} />
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(f.id)}
                  aria-label={sel ? "Abwählen" : "Auswählen"}
                  className={cn(
                    "absolute left-3.5 top-3.5 grid size-6 place-items-center rounded-md ring-1 transition",
                    sel ? "bg-accent text-white ring-accent" : "bg-white/90 text-transparent ring-ink/20 opacity-0 group-hover:opacity-100 max-sm:opacity-100",
                  )}
                >
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void removeFiles([f.id])}
                  aria-label={`${f.name} löschen`}
                  title="Löschen"
                  className="absolute right-3.5 top-3.5 grid size-7 place-items-center rounded-lg bg-white/90 text-stone-dark opacity-0 shadow-sm ring-1 ring-ink/10 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 max-sm:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-sm">
            <thead className="text-left text-xs text-stone-dark">
              <tr className="border-b border-ink/[0.06]">
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Alle auswählen"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(shownFiles.map((f) => f.id)))}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                </th>
                <th className="py-2.5 font-medium">Name</th>
                <th className="w-28 py-2.5 font-medium">Kategorie</th>
                <th className="w-24 py-2.5 text-right font-medium">Größe</th>
                <th className="w-40 py-2.5 pl-5 font-medium">Datum</th>
                <th className="w-40 py-2.5 font-medium">Status</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.05]">
              {shownFolders.map((f) => (
                <tr key={f.path} className="group hover:bg-ink/[0.02]">
                  <td className="px-4" />
                  <td className="py-2.5" colSpan={2}>
                    <Link href={folderHref(f.path)} className="flex items-center gap-3 font-medium hover:text-accent">
                      <FolderGlyph color={f.color} className="size-8 shrink-0 stroke-[1.4]" />
                      <span className="truncate">{f.name}</span>
                      {f.customerId ? <UserRound className="size-3.5 shrink-0 text-sky-600" aria-label="Kundenordner" /> : null}
                    </Link>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-stone-dark">{formatBytes(f.totalSize)}</td>
                  <td className="py-2.5 pl-5 text-stone-dark">{f.lastUpload ? formatDateTime(f.lastUpload).split(",")[0] : "–"}</td>
                  <td className="py-2.5 text-xs text-stone-dark">
                    {f.fileCount} Datei{f.fileCount === 1 ? "" : "en"}
                  </td>
                  <td className="relative py-2.5 pr-4 text-right">
                    <FolderMenu f={f} inline onPick={(mode) => setDialog({ type: "ordner", f, mode })} onDelete={() => void removeFolder(f)} onDownload={() => download({ folder: f.path })} />
                  </td>
                </tr>
              ))}
              {shownFiles.map((f) => (
                <tr key={f.id} className={cn("group", selected.has(f.id) ? "bg-accent/[0.05]" : "hover:bg-ink/[0.02]")}>
                  <td className="px-4">
                    <input type="checkbox" aria-label={`${f.name} auswählen`} checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="size-4 accent-[var(--color-accent)]" />
                  </td>
                  <td className="py-2">
                    <Link href={`/admin/dateien/${f.id}/ansicht`} className="flex items-center gap-3 hover:text-accent">
                      {thumbs[f.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[f.id]} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-ink/10" />
                      ) : (
                        <FileIcon name={f.name} type={f.content_type} className="size-9 rounded-lg [&>span]:hidden" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium" title={f.name}>
                          {f.name}
                        </span>
                        <span className="block truncate text-xs text-stone-dark">
                          {[f.uploaded_by, f.assigned_to ? `für ${nameOf(f.assigned_to)}` : null, flat && f.folder ? f.folder : null, f.message].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="py-2 text-xs">{f.category ? <span className="rounded-full bg-ink/[0.05] px-2 py-0.5">{f.category}</span> : <span className="text-stone">–</span>}</td>
                  <td className="py-2 text-right tabular-nums text-stone-dark">{formatBytes(f.size)}</td>
                  <td className="whitespace-nowrap py-2 pl-5 text-stone-dark">{formatDateTime(f.created_at)}</td>
                  <td className="py-2">
                    <FileStatusSelect id={f.id} status={f.status} />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <a href={`/admin/dateien/${f.id}`} className="inline-grid size-8 place-items-center rounded-md text-stone-dark hover:bg-ink/[0.06]" title="Herunterladen" aria-label="Herunterladen">
                      <Download className="size-4" />
                    </a>
                    <button type="button" onClick={() => void removeFiles([f.id])} className="inline-grid size-8 place-items-center rounded-md text-stone-dark hover:bg-red-50 hover:text-red-600" title="Löschen" aria-label={`${f.name} löschen`}>
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Download-Fortschritt */}
      {dl ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)] rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-ink/10" role="status">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {dl.state === "fertig" ? "Download fertig ✓" : dl.state === "fehler" ? "Download fehlgeschlagen" : dl.total ? `Herunterladen … ${dl.done} / ${dl.total}` : "Wird vorbereitet …"}
              </p>
              <p className="mt-0.5 text-xs text-stone-dark">
                {dl.state === "fehler"
                  ? dl.error
                  : dl.mode === "ordner"
                    ? "Direkt in den gewählten Ordner – ohne ZIP"
                    : "Dieser Browser kann keine Ordner speichern – ZIP wird erstellt (Chrome/Edge speichern direkt)"}
              </p>
            </div>
            <button
              type="button"
              aria-label={dl.state === "läuft" ? "Abbrechen" : "Schließen"}
              onClick={() => {
                if (dl.state === "läuft") dlAbort.current?.abort();
                setDl(null);
              }}
              className="grid size-7 shrink-0 place-items-center rounded-md text-stone-dark hover:bg-ink/[0.06]"
            >
              <X className="size-4" />
            </button>
          </div>
          {dl.state !== "fehler" ? (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-200", dl.state === "fertig" ? "bg-emerald-500" : "bg-accent")}
                  style={{ width: `${dl.totalBytes ? Math.min(100, Math.round((dl.bytes / dl.totalBytes) * 100)) : dl.state === "fertig" ? 100 : 3}%` }}
                />
              </div>
              {dl.totalBytes ? (
                <p className="mt-1.5 text-right text-[0.7rem] tabular-nums text-stone-dark">
                  {formatBytes(dl.bytes)} / {formatBytes(dl.totalBytes)}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {/* Dialoge */}
      {dialog?.type === "neu" ? (
        <NewFolderDialog
          parent={folder}
          customers={customers}
          onClose={() => setDialog(null)}
          onCreate={(input) =>
            start(async () => {
              const r = await createFolder(input);
              if (r.error) setMsg(r.error);
              setDialog(null);
              if (r.path) router.push(folderHref(r.path));
            })
          }
          pending={pending}
        />
      ) : null}
      {dialog?.type === "verschieben" ? (
        <Modal title={`${selected.size} Datei(en) verschieben`} onClose={() => setDialog(null)}>
          <FolderPicker
            allFolders={allFolders}
            initial={folder}
            pending={pending}
            onPick={(target) => {
              const ids = [...selected];
              const undo = !flat && target !== folder ? hide(ids) : patch(ids, { folder: target });
              run(
                () => moveFiles({ ids, folder: target }),
                () => {
                  setSelected(new Set());
                  setDialog(null);
                },
                undo,
              );
            }}
          />
        </Modal>
      ) : null}
      {dialog?.type === "kategorie" ? (
        <Modal title="Kategorie festlegen" onClose={() => setDialog(null)}>
          <div className="flex flex-wrap gap-2">
            {[...fileCategories, ...categories.filter((c) => !(fileCategories as readonly string[]).includes(c))].map((c) => (
              <button
                key={c}
                type="button"
                disabled={pending}
                onClick={() => {
                  const ids = [...selected];
                  run(() => updateFiles({ ids, category: c }), () => setDialog(null), patch(ids, { category: c }));
                }}
                className="h-9 rounded-full bg-ink/[0.05] px-3.5 text-sm hover:bg-accent hover:text-white"
              >
                {c}
              </button>
            ))}
            <button type="button" disabled={pending} onClick={() => {
                const ids = [...selected];
                run(() => updateFiles({ ids, category: null }), () => setDialog(null), patch(ids, { category: null }));
              }} className="h-9 rounded-full px-3.5 text-sm text-stone-dark ring-1 ring-ink/10 hover:ring-ink/30">
              Keine Kategorie
            </button>
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = String(new FormData(e.currentTarget).get("c") ?? "").trim();
              if (v) {
                const ids = [...selected];
                run(() => updateFiles({ ids, category: v }), () => setDialog(null), patch(ids, { category: v }));
              }
            }}
          >
            <input name="c" className="adm-input" placeholder="Eigene Kategorie …" maxLength={60} />
            <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>
              OK
            </button>
          </form>
        </Modal>
      ) : null}
      {dialog?.type === "ordner" ? (
        <FolderDialog
          f={dialog.f}
          mode={dialog.mode}
          allFolders={allFolders}
          pending={pending}
          onClose={() => setDialog(null)}
          onRename={(name) =>
            start(async () => {
              const r = await renameFolder({ path: dialog.f.path, name });
              setMsg(r.error ?? null);
              setDialog(null);
            })
          }
          onMove={(target) =>
            start(async () => {
              const r = await moveFolder({ path: dialog.f.path, target });
              setMsg(r.error ?? null);
              setDialog(null);
            })
          }
          onColor={(color) =>
            start(async () => {
              setDialog(null);
              await setFolderColor({ path: dialog.f.path, color });
            })
          }
        />
      ) : null}
    </div>
  );
}

function FolderMenu({
  f,
  onPick,
  onDelete,
  onDownload,
  inline,
}: {
  f: FolderEntry;
  onPick: (mode: "umbenennen" | "verschieben" | "farbe") => void;
  onDelete: () => void;
  onDownload: () => void;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn(inline ? "relative inline-block" : "absolute right-2 top-2")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("grid size-8 place-items-center rounded-md text-stone-dark hover:bg-ink/[0.06]", !inline && "bg-white/80 opacity-0 group-hover:opacity-100 max-sm:opacity-100")}
        aria-label={`Ordner ${f.name} – Aktionen`}
        aria-expanded={open}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Menü schließen" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl bg-white py-1 text-left text-sm shadow-xl ring-1 ring-ink/10">
            {(
              [
                ["umbenennen", Pencil, "Umbenennen"],
                ["verschieben", FolderInput, "Verschieben"],
                ["farbe", Palette, "Farbe"],
              ] as const
            ).map(([mode, Icon, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(mode);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-ink/[0.04]"
              >
                <Icon className="size-4 text-stone-dark" aria-hidden /> {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDownload();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-ink/[0.04]"
            >
              <Download className="size-4 text-stone-dark" aria-hidden /> Herunterladen
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="size-4" aria-hidden /> Löschen
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ColorSwatches({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onChange(null)} className={cn("grid size-8 place-items-center rounded-full bg-amber-400/80 ring-2 ring-offset-2", value === null ? "ring-ink" : "ring-transparent")} aria-label="Standardfarbe" />
      {folderColors.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} className={cn("size-8 rounded-full ring-2 ring-offset-2", value === c ? "ring-ink" : "ring-transparent")} style={{ background: c }} aria-label={`Farbe ${c}`} />
      ))}
    </div>
  );
}

function NewFolderDialog({
  parent,
  customers,
  onClose,
  onCreate,
  pending,
}: {
  parent: string;
  customers: { id: string; label: string }[];
  onClose: () => void;
  onCreate: (input: { parent: string; name: string; withDate: boolean; color: string | null; customerId: string | null }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [withDate, setWithDate] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  // Kundenordner landen auf oberster Ebene unter „Kunden“
  const target = customerId && !parent ? "Kunden" : parent;
  return (
    <Modal title="Neuer Ordner" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onCreate({ parent: target, name, withDate, color, customerId: customerId || null });
        }}
      >
        <div>
          <label className="adm-label" htmlFor="nf-customer">
            Kundenordner? (optional)
          </label>
          <select
            id="nf-customer"
            className="adm-input"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const c = customers.find((x) => x.id === e.target.value);
              if (c) setName(c.label);
            }}
          >
            <option value="">– kein Kunde –</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="adm-label" htmlFor="nf-name">
            Name *
          </label>
          <input id="nf-name" autoFocus required className="adm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Bäckerei Sonnenschein" />
          <p className="mt-1 text-xs text-stone-dark">
            Wird angelegt in: <strong>{target || "Alle Dateien"}</strong> → {joinFolder(target, `${withDate ? `${datePrefix()} ` : ""}${name || "…"}`)}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withDate} onChange={(e) => setWithDate(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
          Datum voranstellen ({datePrefix()} …)
        </label>
        <div>
          <span className="adm-label">Farbe</span>
          <ColorSwatches value={color} onChange={setColor} />
        </div>
        <button type="submit" disabled={pending || !name.trim()} className="adm-btn adm-btn-primary w-full">
          <FolderPlus className="size-4" aria-hidden /> Ordner anlegen
        </button>
      </form>
    </Modal>
  );
}

function FolderPicker({ allFolders, initial, onPick, pending, exclude }: { allFolders: string[]; initial: string; onPick: (path: string) => void; pending: boolean; exclude?: string }) {
  const [value, setValue] = useState(initial);
  const [q, setQ] = useState("");
  const list = allFolders.filter((p) => (!exclude || (p !== exclude && !p.startsWith(`${exclude}/`))) && (!q || p.toLowerCase().includes(q.toLowerCase()))).slice(0, 200);
  return (
    <div className="space-y-3">
      <input className="adm-input" placeholder="Ordner suchen …" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="max-h-64 overflow-y-auto rounded-xl ring-1 ring-ink/10">
        <li>
          <button type="button" onClick={() => setValue("")} className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm", value === "" ? "bg-accent/10 font-semibold text-accent" : "hover:bg-ink/[0.03]")}>
            <Folder className="size-4" aria-hidden /> Alle Dateien (oberste Ebene)
          </button>
        </li>
        {list.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => setValue(p)}
              className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm", value === p ? "bg-accent/10 font-semibold text-accent" : "hover:bg-ink/[0.03]")}
              style={{ paddingLeft: `${0.75 + (p.split("/").length - 1) * 0.9}rem` }}
            >
              <Folder className="size-4 shrink-0" aria-hidden /> <span className="truncate">{p.split("/").pop()}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="truncate text-xs text-stone-dark">Ziel: {value || "Alle Dateien"}</p>
      <button type="button" disabled={pending} onClick={() => onPick(value)} className="adm-btn adm-btn-primary w-full">
        <FolderInput className="size-4" aria-hidden /> Hierher verschieben
      </button>
    </div>
  );
}

function FolderDialog({
  f,
  mode,
  allFolders,
  pending,
  onClose,
  onRename,
  onMove,
  onColor,
}: {
  f: FolderEntry;
  mode: "umbenennen" | "verschieben" | "farbe";
  allFolders: string[];
  pending: boolean;
  onClose: () => void;
  onRename: (name: string) => void;
  onMove: (target: string) => void;
  onColor: (c: string | null) => void;
}) {
  const [name, setName] = useState(f.name);
  if (mode === "umbenennen")
    return (
      <Modal title="Ordner umbenennen" onClose={onClose}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onRename(name);
          }}
        >
          <input autoFocus className="adm-input" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" disabled={pending || !name.trim()} className="adm-btn adm-btn-primary w-full">
            <Pencil className="size-4" aria-hidden /> Umbenennen
          </button>
        </form>
      </Modal>
    );
  if (mode === "verschieben")
    return (
      <Modal title={`„${f.name}“ verschieben nach …`} onClose={onClose}>
        <FolderPicker allFolders={allFolders} initial="" exclude={f.path} pending={pending} onPick={onMove} />
      </Modal>
    );
  return (
    <Modal title="Ordnerfarbe" onClose={onClose}>
      <ColorSwatches value={f.color} onChange={onColor} />
    </Modal>
  );
}
