"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, CloudUpload, FolderUp, Loader2, Mail, SlidersHorizontal, X } from "lucide-react";
import { abortUpload, completeUploadBatch, finishUpload, startUpload } from "@/app/admin/file-actions";
import { datePrefix, fileCategories, formatBytes, MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD, UPLOAD_CHUNK } from "@/lib/files/shared";
import { previewsFromFile } from "@/lib/files/preview-client";
import { savePreviews } from "@/lib/files/preview-upload";
import { Notice } from "@/components/admin/ui";
import { FileIcon } from "./FileIcon";
import { cn } from "@/lib/utils";

type State = "wartet" | "vorbereitet" | "laedt" | "fertig" | "fehler";
type Item = { key: string; file: File; dir: string; progress: number; state: State; error?: string; id?: string; url?: string; contentType?: string };

const PARALLEL = 4;
const IGNORE = /^(\.ds_store|thumbs\.db|desktop\.ini)$|^\._/i;

/* ----------------------- Ordner aus Drag & Drop lesen ----------------------- */

type FsEntry = { isFile: boolean; isDirectory: boolean; name: string; fullPath: string; file?: (cb: (f: File) => void, err: (e: unknown) => void) => void; createReader?: () => { readEntries: (cb: (e: FsEntry[]) => void, err: (e: unknown) => void) => void } };

async function readEntry(entry: FsEntry, dir: string, out: { file: File; dir: string }[]) {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((res, rej) => entry.file!(res, rej));
    out.push({ file, dir });
  } else if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    const sub = dir ? `${dir}/${entry.name}` : entry.name;
    // readEntries liefert nur Teilmengen – so lange lesen, bis nichts mehr kommt
    for (;;) {
      const batch = await new Promise<FsEntry[]>((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await readEntry(e, sub, out);
    }
  }
}

async function filesFromDrop(dt: DataTransfer): Promise<{ file: File; dir: string }[]> {
  const entries: FsEntry[] = [];
  for (const i of Array.from(dt.items ?? [])) {
    const entry = i.kind === "file" && typeof i.webkitGetAsEntry === "function" ? (i.webkitGetAsEntry() as unknown as FsEntry | null) : null;
    if (entry) entries.push(entry);
  }
  if (!entries.length) return Array.from(dt.files).map((file) => ({ file, dir: "" }));
  const out: { file: File; dir: string }[] = [];
  for (const e of entries) await readEntry(e, "", out);
  return out;
}

/** Datei per PUT direkt zu R2 – mit Fortschritt */
function putFile(url: string, file: File, contentType: string, onProgress: (loaded: number) => void, register: (x: XMLHttpRequest) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    register(xhr);
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload fehlgeschlagen (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Verbindung unterbrochen"));
    xhr.onabort = () => reject(new Error("Abgebrochen"));
    xhr.send(file);
  });
}

export function FileUploader({
  projects,
  team,
  defaultProjectId,
  folder = "",
  compact,
  configured,
}: {
  projects: { id: string; label: string }[];
  team: { email: string; name: string }[];
  defaultProjectId?: string;
  /** Zielordner (aktueller Ordner im Datei-Browser) */
  folder?: string;
  compact?: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const dirInput = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [opts, setOpts] = useState({ projectId: defaultProjectId ?? "", message: "", assignedTo: "", notify: true, category: "", withDate: false });
  // Anzeige-Kopie des Upload-Zustands (die Arbeitsdaten liegen in Refs)
  const [view, setView] = useState<{ items: Item[]; running: boolean }>({ items: [], running: false });
  const [result, setResult] = useState<{ ok?: string; error?: string }>({});

  const items = useRef<Item[]>([]);
  const running = useRef(false);
  const xhrs = useRef(new Set<XMLHttpRequest>());
  const sessionIds = useRef<string[]>([]);
  const optsRef = useRef(opts);
  const cancelled = useRef(false);
  const lastPaint = useRef(0);
  const previewJobs = useRef<{ id: string; file: File }[]>([]);
  const previewRunning = useRef(false);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  const paint = (force = false) => {
    const now = Date.now();
    if (force || now - lastPaint.current > 120) {
      lastPaint.current = now;
      setView({ items: items.current.map((i) => ({ ...i })), running: running.current });
    }
  };
  const set = (it: Item, patch: Partial<Item>) => {
    Object.assign(it, patch);
    paint(patch.state !== undefined);
  };

  /** Vorschaubilder nacheinander im Hintergrund erzeugen (die Datei liegt lokal vor) */
  const runPreviews = async () => {
    if (previewRunning.current) return;
    previewRunning.current = true;
    let saved = 0;
    try {
      for (;;) {
        const job = previewJobs.current.shift();
        if (!job) break;
        const p = await previewsFromFile(job.file);
        if (p && (await savePreviews(job.id, p))) saved++;
      }
    } finally {
      previewRunning.current = false;
      if (saved) router.refresh();
    }
  };

  const process = async () => {
    if (running.current) return;
    running.current = true;
    cancelled.current = false;
    try {
      for (;;) {
        if (cancelled.current) break;
        const chunk = items.current.filter((i) => i.state === "wartet").slice(0, UPLOAD_CHUNK);
        if (!chunk.length) break;
        const o = optsRef.current;
        const res = await startUpload({
          files: chunk.map((i) => ({ name: i.file.name, size: i.file.size, type: i.file.type || "application/octet-stream", dir: i.dir })),
          folder,
          category: o.category || null,
          projectId: o.projectId || null,
          message: o.message.trim() || null,
          assignedTo: o.assignedTo || null,
        });
        if (res.error || !res.uploads) {
          chunk.forEach((i) => set(i, { state: "fehler", error: res.error ?? "Fehler" }));
          setResult({ error: res.error ?? "Upload fehlgeschlagen." });
          continue;
        }
        chunk.forEach((i, n) => set(i, { state: "vorbereitet", id: res.uploads![n].id, url: res.uploads![n].url, contentType: res.uploads![n].contentType }));

        // parallel hochladen
        let cursor = 0;
        const okIds: string[] = [];
        const failIds: string[] = [];
        const worker = async () => {
          while (cursor < chunk.length && !cancelled.current) {
            const it = chunk[cursor++];
            set(it, { state: "laedt", progress: 0 });
            try {
              await putFile(it.url!, it.file, it.contentType!, (loaded) => set(it, { progress: loaded }), (x) => {
                xhrs.current.add(x);
                x.addEventListener("loadend", () => xhrs.current.delete(x));
              });
              set(it, { state: "fertig", progress: it.file.size });
              okIds.push(it.id!);
            } catch (e) {
              set(it, { state: "fehler", error: e instanceof Error ? e.message : "Fehler" });
              failIds.push(it.id!);
            }
          }
        };
        await Promise.all(Array.from({ length: PARALLEL }, worker));
        chunk.filter((i) => i.state === "vorbereitet").forEach((i) => failIds.push(i.id!));
        if (failIds.length) await abortUpload(failIds);
        if (okIds.length) {
          const fin = await finishUpload(okIds);
          if (!fin.error) {
            sessionIds.current.push(...okIds);
            for (const it of chunk) if (it.state === "fertig" && it.id) previewJobs.current.push({ id: it.id, file: it.file });
            void runPreviews();
          }
        }
      }
      // Vorgang abgeschlossen → einmal benachrichtigen und Liste aktualisieren
      if (sessionIds.current.length) {
        const ids = sessionIds.current;
        sessionIds.current = [];
        const o = optsRef.current;
        const done = await completeUploadBatch({ ids, notify: o.notify && !!o.assignedTo });
        setResult(done.error ? { error: done.error } : { ok: done.ok });
        router.refresh();
      }
    } finally {
      running.current = false;
      paint(true);
      // falls während des Abschlusses neue Dateien kamen
      if (!cancelled.current && items.current.some((i) => i.state === "wartet")) void process();
    }
  };

  const add = (list: { file: File; dir: string }[]) => {
    setResult({});
    // abgeschlossene Einträge eines früheren Vorgangs ausblenden
    if (!running.current) items.current = items.current.filter((i) => i.state !== "fertig");
    let added = 0;
    const withDate = optsRef.current.withDate;
    const stamp = datePrefix();
    for (const entry of list) {
      const { file } = entry;
      // Hochgeladene Ordner optional mit Datum versehen: "2026-11-19 Ordnername"
      const dir = withDate && entry.dir ? [`${stamp} ${entry.dir.split("/")[0]}`, ...entry.dir.split("/").slice(1)].join("/") : entry.dir;
      if (IGNORE.test(file.name)) continue;
      if (items.current.length >= MAX_FILES_PER_UPLOAD) break;
      const tooBig = file.size > MAX_FILE_SIZE;
      items.current.push({
        key: `${dir}/${file.name}/${file.size}/${file.lastModified}/${Math.random()}`,
        file,
        dir,
        progress: 0,
        state: tooBig || file.size === 0 ? "fehler" : "wartet",
        error: tooBig ? "größer als 5 GB" : file.size === 0 ? "leere Datei" : undefined,
      });
      added++;
    }
    if (list.length && !added) setResult({ error: "Keine hochladbaren Dateien gefunden." });
    paint(true);
    void process();
  };

  const cancel = () => {
    cancelled.current = true;
    xhrs.current.forEach((x) => x.abort());
    items.current.filter((i) => i.state === "wartet").forEach((i) => set(i, { state: "fehler", error: "Abgebrochen" }));
    paint(true);
  };
  const clearDone = () => {
    items.current = items.current.filter((i) => i.state === "wartet" || i.state === "laedt" || i.state === "vorbereitet");
    paint(true);
  };

  if (!configured) {
    return <Notice tone="warn">Der Cloud-Speicher ist noch nicht verbunden. Sobald die R2-Zugangsschlüssel in Vercel hinterlegt sind, funktioniert der Upload.</Notice>;
  }

  const all = view.items;
  const totalBytes = all.reduce((s, i) => s + (i.state === "fehler" ? 0 : i.file.size), 0);
  const doneBytes = all.reduce((s, i) => s + (i.state === "fertig" ? i.file.size : i.state === "laedt" ? i.progress : 0), 0);
  const counts = {
    fertig: all.filter((i) => i.state === "fertig").length,
    offen: all.filter((i) => i.state === "wartet" || i.state === "laedt" || i.state === "vorbereitet").length,
    fehler: all.filter((i) => i.state === "fehler").length,
  };
  const busy = counts.offen > 0 || view.running;
  const pct = totalBytes ? Math.round((doneBytes / totalBytes) * 100) : 0;
  const visible = [...all.filter((i) => i.state === "laedt" || i.state === "fehler"), ...all.filter((i) => i.state !== "laedt" && i.state !== "fehler")].slice(0, 8);
  const optionSummary = [
    opts.projectId && !defaultProjectId ? (projects.find((p) => p.id === opts.projectId)?.label.split(" · ")[0] ?? "Auftrag") : null,
    opts.assignedTo ? `für ${team.find((m) => m.email === opts.assignedTo)?.name ?? opts.assignedTo}` : null,
    opts.message ? "mit Nachricht" : null,
    opts.category || null,
    opts.withDate ? "Ordner mit Datum" : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {/* Optionen – gelten für alles, was danach hineingezogen wird */}
      <div className="rounded-xl bg-[#f7f5f1] ring-1 ring-ink/[0.06]">
        <button type="button" onClick={() => setShowOptions((v) => !v)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm" aria-expanded={showOptions}>
          <SlidersHorizontal className="size-4 text-accent" aria-hidden />
          <span className="font-medium">Kategorie, Auftrag, Nachricht & Empfänger</span>
          <span className="min-w-0 flex-1 truncate text-xs text-stone-dark">{optionSummary.length ? optionSummary.join(" · ") : "optional – vor dem Hineinziehen festlegen"}</span>
          <ChevronDown className={cn("size-4 text-stone-dark transition-transform", showOptions && "rotate-180")} aria-hidden />
        </button>
        {showOptions ? (
          <div className="grid gap-3 border-t border-ink/[0.06] p-3.5 sm:grid-cols-2">
            {!defaultProjectId ? (
              <div className="sm:col-span-2">
                <label className="adm-label" htmlFor="up-project">
                  Zu welchem Auftrag?
                </label>
                <select id="up-project" className="adm-input" value={opts.projectId} onChange={(e) => setOpts((o) => ({ ...o, projectId: e.target.value }))}>
                  <option value="">– kein Auftrag –</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="adm-label" htmlFor="up-category">
                Kategorie
              </label>
              <input id="up-category" list="up-categories" className="adm-input" value={opts.category} onChange={(e) => setOpts((o) => ({ ...o, category: e.target.value }))} placeholder="z. B. Druckdaten" />
              <datalist id="up-categories">
                {fileCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
              <input type="checkbox" checked={opts.withDate} onChange={(e) => setOpts((o) => ({ ...o, withDate: e.target.checked }))} className="size-4 accent-[var(--color-accent)]" />
              Hochgeladene Ordner mit Datum versehen ({datePrefix()} …)
            </label>
            <div className="sm:col-span-2">
              <label className="adm-label" htmlFor="up-message">
                Nachricht / Details
              </label>
              <textarea id="up-message" rows={2} className="adm-input" value={opts.message} onChange={(e) => setOpts((o) => ({ ...o, message: e.target.value }))} placeholder="z. B. Druckfertig – bitte auf 3 mm Beschnitt achten, Farbe HKS 13" />
            </div>
            <div>
              <label className="adm-label" htmlFor="up-assign">
                Für wen?
              </label>
              <select id="up-assign" className="adm-input" value={opts.assignedTo} onChange={(e) => setOpts((o) => ({ ...o, assignedTo: e.target.value }))}>
                <option value="">– alle –</option>
                {team.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.name === m.email ? m.email : `${m.name} (${m.email})`}
                  </option>
                ))}
              </select>
            </div>
            <label className={cn("flex items-center gap-2 self-end pb-2.5 text-sm", !opts.assignedTo && "opacity-40")}>
              <input type="checkbox" checked={opts.notify} disabled={!opts.assignedTo} onChange={(e) => setOpts((o) => ({ ...o, notify: e.target.checked }))} className="size-4 accent-[var(--color-accent)]" />
              <Mail className="size-4 text-stone-dark" aria-hidden /> nach dem Upload per E-Mail benachrichtigen
            </label>
          </div>
        ) : null}
      </div>

      {/* Ablagefläche */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDrag(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          setDrag(false);
          add(await filesFromDrop(e.dataTransfer));
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-6" : "px-6 py-9",
          drag ? "border-accent bg-accent/[0.06]" : "border-ink/15 bg-white",
        )}
      >
        <CloudUpload className={cn("text-accent", compact ? "size-7" : "size-10")} aria-hidden />
        <div>
          <p className="font-semibold">Dateien oder ganze Ordner hierher ziehen</p>
          <p className="mt-0.5 text-xs text-stone-dark">Der Upload startet sofort · jede Datei bis 5 GB · Ordnerstruktur bleibt erhalten</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} className="adm-btn adm-btn-primary adm-btn-sm">
            <CloudUpload className="size-4" aria-hidden /> Dateien wählen
          </button>
          <button type="button" onClick={() => dirInput.current?.click()} className="adm-btn adm-btn-ghost adm-btn-sm">
            <FolderUp className="size-4" aria-hidden /> Ordner wählen
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) add(Array.from(e.target.files).map((file) => ({ file, dir: "" })));
            e.target.value = "";
          }}
        />
        <input
          ref={dirInput}
          type="file"
          multiple
          hidden
          {...{ webkitdirectory: "", directory: "" }}
          onChange={(e) => {
            if (e.target.files)
              add(
                Array.from(e.target.files).map((file) => {
                  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
                  return { file, dir: rel.split("/").slice(0, -1).join("/") };
                }),
              );
            e.target.value = "";
          }}
        />
      </div>

      {/* Fortschritt */}
      {all.length ? (
        <div className="rounded-xl bg-white p-3.5 ring-1 ring-ink/[0.07]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium">
              {busy ? <Loader2 className="size-4 animate-spin text-accent" aria-hidden /> : <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />}
              {busy ? `Lädt hoch … ${counts.fertig} von ${all.length - counts.fehler}` : `${counts.fertig} hochgeladen`}
              {counts.fehler ? <span className="text-red-700">· {counts.fehler} Fehler</span> : null}
            </span>
            <span className="flex items-center gap-2 text-xs tabular-nums text-stone-dark">
              {formatBytes(doneBytes)} / {formatBytes(totalBytes)} · {pct} %
              {busy ? (
                <button type="button" onClick={cancel} className="rounded-md px-2 py-1 text-red-700 hover:bg-red-50">
                  Abbrechen
                </button>
              ) : (
                <button type="button" onClick={clearDone} className="rounded-md px-2 py-1 hover:bg-ink/[0.05]">
                  Liste leeren
                </button>
              )}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <div className={cn("h-full rounded-full transition-[width] duration-300", busy ? "bg-accent" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-3 space-y-1.5">
            {visible.map((it) => (
              <li key={it.key} className="flex items-center gap-2.5 text-sm">
                <FileIcon name={it.file.name} type={it.file.type} className="size-8 rounded-lg [&>span]:hidden" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {it.dir ? <span className="text-stone-dark">{it.dir}/</span> : null}
                    {it.file.name}
                  </span>
                  {it.state === "laedt" ? (
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                      <span className="block h-full bg-accent" style={{ width: `${Math.round((it.progress / Math.max(1, it.file.size)) * 100)}%` }} />
                    </span>
                  ) : it.error ? (
                    <span className="block text-xs text-red-700">{it.error}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-stone-dark">{formatBytes(it.file.size)}</span>
                {it.state === "fertig" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label="fertig" />
                ) : it.state === "fehler" ? (
                  <X className="size-4 shrink-0 text-red-600" aria-label="Fehler" />
                ) : (
                  <Loader2 className={cn("size-4 shrink-0 text-stone", it.state === "laedt" && "animate-spin text-accent")} aria-hidden />
                )}
              </li>
            ))}
          </ul>
          {all.length > visible.length ? <p className="mt-2 text-xs text-stone-dark">… und {all.length - visible.length} weitere</p> : null}
        </div>
      ) : null}

      {result.ok ? <Notice tone="success">{result.ok}</Notice> : null}
      {result.error ? <Notice tone="error">{result.error}</Notice> : null}
    </div>
  );
}
