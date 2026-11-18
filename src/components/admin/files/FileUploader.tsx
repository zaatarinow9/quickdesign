"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, Loader2, Mail, X } from "lucide-react";
import { abortUpload, finishUpload, startUpload } from "@/app/admin/file-actions";
import { formatBytes, MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD } from "@/lib/files/shared";
import { Notice } from "@/components/admin/ui";
import { FileIcon } from "./FileIcon";
import { cn } from "@/lib/utils";

type Item = { file: File; progress: number; state: "wartet" | "laedt" | "fertig" | "fehler"; error?: string };

/** Datei per PUT direkt zu R2 – mit Fortschritt */
function putFile(url: string, file: File, contentType: string, onProgress: (p: number) => void, signal: { xhr?: XMLHttpRequest }) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    signal.xhr = xhr;
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
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
  compact,
  configured,
}: {
  projects: { id: string; label: string }[];
  team: { email: string; name: string }[];
  defaultProjectId?: string;
  compact?: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [message, setMessage] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok?: string; error?: string }>({});
  const xhrs = useRef<{ xhr?: XMLHttpRequest }[]>([]);

  const add = (list: FileList | File[]) => {
    setResult({});
    const next = [...items.filter((i) => i.state !== "fertig")];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES_PER_UPLOAD) break;
      if (next.some((i) => i.file.name === f.name && i.file.size === f.size)) continue;
      next.push({ file: f, progress: 0, state: f.size > MAX_FILE_SIZE ? "fehler" : "wartet", error: f.size > MAX_FILE_SIZE ? "größer als 5 GB" : f.size === 0 ? "leer" : undefined });
    }
    setItems(next);
  };
  const update = (i: number, patch: Partial<Item>) => setItems((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const upload = async () => {
    const queue = items.map((it, i) => ({ it, i })).filter(({ it }) => it.state === "wartet" && it.file.size > 0);
    if (!queue.length) return;
    setBusy(true);
    setResult({});
    const res = await startUpload({
      files: queue.map(({ it }) => ({ name: it.file.name, size: it.file.size, type: it.file.type || "application/octet-stream" })),
      projectId: projectId || null,
      message: message.trim() || null,
      assignedTo: assignedTo || null,
    });
    if (res.error || !res.uploads) {
      setResult({ error: res.error ?? "Upload fehlgeschlagen." });
      setBusy(false);
      return;
    }
    const uploads = res.uploads;
    const okIds: string[] = [];
    const failedIds: string[] = [];
    // max. 3 Dateien gleichzeitig
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const n = cursor++;
        const { it, i } = queue[n];
        const up = uploads[n];
        const sig: { xhr?: XMLHttpRequest } = {};
        xhrs.current.push(sig);
        update(i, { state: "laedt", progress: 0 });
        try {
          await putFile(up.url, it.file, up.contentType, (p) => update(i, { progress: p }), sig);
          update(i, { state: "fertig", progress: 1 });
          okIds.push(up.id);
        } catch (e) {
          update(i, { state: "fehler", error: e instanceof Error ? e.message : "Fehler" });
          failedIds.push(up.id);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    xhrs.current = [];
    if (failedIds.length) await abortUpload(failedIds);
    if (okIds.length) {
      const fin = await finishUpload({ ids: okIds, notify: notify && !!assignedTo });
      setResult(fin.error ? { error: fin.error } : { ok: fin.ok });
      if (!fin.error) {
        setMessage("");
        router.refresh();
      }
    } else setResult({ error: "Keine Datei wurde hochgeladen." });
    setBusy(false);
  };

  const cancel = () => xhrs.current.forEach((s) => s.xhr?.abort());
  const waiting = items.filter((i) => i.state === "wartet").length;
  const totalSize = items.filter((i) => i.state === "wartet").reduce((s, i) => s + i.file.size, 0);

  if (!configured) {
    return <Notice tone="warn">Der Cloud-Speicher ist noch nicht verbunden. Sobald die R2-Zugangsschlüssel in Vercel hinterlegt sind, funktioniert der Upload.</Notice>;
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy && e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-6" : "px-6 py-10",
          drag ? "border-accent bg-accent/[0.06]" : "border-ink/15 bg-white hover:border-accent/60 hover:bg-accent/[0.02]",
        )}
      >
        <CloudUpload className={cn("text-accent", compact ? "size-7" : "size-10")} aria-hidden />
        <p className="font-semibold">Dateien hierher ziehen oder klicken</p>
        <p className="text-xs text-stone-dark">PDF, AI, PSD, Bilder, ZIP … bis 5 GB pro Datei · bis zu {MAX_FILES_PER_UPLOAD} Dateien auf einmal</p>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length ? (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={`${it.file.name}-${it.file.size}`} className="flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-ink/[0.07]">
              <FileIcon name={it.file.name} type={it.file.type} className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{it.file.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-stone-dark">
                    {it.state === "laedt" ? `${Math.round(it.progress * 100)} % · ` : ""}
                    {formatBytes(it.file.size)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-200", it.state === "fehler" ? "bg-red-500" : it.state === "fertig" ? "bg-emerald-500" : "bg-accent")}
                    style={{ width: `${it.state === "fehler" ? 100 : Math.round(it.progress * 100)}%` }}
                  />
                </div>
                {it.error ? <p className="mt-1 text-xs text-red-700">{it.error}</p> : null}
              </div>
              {it.state === "fertig" ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label="Hochgeladen" />
              ) : it.state === "laedt" ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-accent" aria-hidden />
              ) : (
                <button type="button" disabled={busy} onClick={() => setItems((l) => l.filter((_, j) => j !== i))} className="grid size-7 shrink-0 place-items-center rounded-md text-stone-dark hover:bg-ink/[0.06]" aria-label="Entfernen">
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {waiting ? (
        <div className="grid gap-3 rounded-2xl bg-[#f7f5f1] p-4 ring-1 ring-ink/[0.06] sm:grid-cols-2">
          {!defaultProjectId ? (
            <div className="sm:col-span-2">
              <label className="adm-label" htmlFor="up-project">
                Zu welchem Auftrag? (optional)
              </label>
              <select id="up-project" className="adm-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">– kein Auftrag –</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className="adm-label" htmlFor="up-message">
              Nachricht / Details (optional)
            </label>
            <textarea id="up-message" rows={2} className="adm-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="z. B. Druckfertig – bitte auf 3 mm Beschnitt achten, Farbe HKS 13" />
          </div>
          <div>
            <label className="adm-label" htmlFor="up-assign">
              Für wen?
            </label>
            <select id="up-assign" className="adm-input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">– alle –</option>
              {team.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name === m.email ? m.email : `${m.name} (${m.email})`}
                </option>
              ))}
            </select>
          </div>
          <label className={cn("flex items-center gap-2 self-end pb-2.5 text-sm", !assignedTo && "opacity-40")}>
            <input type="checkbox" checked={notify} disabled={!assignedTo} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
            <Mail className="size-4 text-stone-dark" aria-hidden /> per E-Mail benachrichtigen
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <span className="text-sm text-stone-dark">
              {waiting} Datei{waiting === 1 ? "" : "en"} · {formatBytes(totalSize)}
            </span>
            <div className="flex gap-2">
              {busy ? (
                <button type="button" onClick={cancel} className="adm-btn adm-btn-ghost">
                  Abbrechen
                </button>
              ) : null}
              <button type="button" onClick={upload} disabled={busy} className="adm-btn adm-btn-primary min-w-40">
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CloudUpload className="size-4" aria-hidden />} {busy ? "Lädt hoch …" : "Hochladen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {result.ok ? <Notice tone="success">{result.ok}</Notice> : null}
      {result.error ? <Notice tone="error">{result.error}</Notice> : null}
    </div>
  );
}
