"use client";

import type { DownloadItem } from "@/app/admin/file-actions";

export type DownloadProgress = { done: number; total: number; bytes: number; totalBytes: number; mode: "ordner" | "zip" };

type DirHandle = {
  name: string;
  getDirectoryHandle: (name: string, o?: { create?: boolean }) => Promise<DirHandle>;
  getFileHandle: (name: string, o?: { create?: boolean }) => Promise<{ createWritable: () => Promise<WritableStream<Uint8Array>> }>;
};
type Picker = (o?: { id?: string; mode?: "readwrite"; startIn?: string }) => Promise<DirHandle>;

/** Ordner direkt auf den Rechner speichern möglich? (Chrome, Edge, Opera am Computer) */
export const canSaveFolders = () => typeof window !== "undefined" && typeof (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker === "function";

/** Dateinamen für das Dateisystem säubern */
const clean = (s: string) => s.replace(/[\\:*?"<>|]/g, "_").replace(/^\.+$/, "_").trim() || "_";

async function pool<T>(list: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, list.length) }, async () => {
      while (i < list.length) await fn(list[i++]);
    }),
  );
}

/** Zählt übertragene Bytes beim Durchreichen */
function counter(onBytes: (n: number) => void) {
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      onBytes(chunk.byteLength);
      ctrl.enqueue(chunk);
    },
  });
}

/**
 * Lädt einen Ordner mit seiner Struktur herunter.
 *  - Chrome/Edge: Zielordner wählen → Dateien landen direkt entpackt im Ordner „name“
 *  - andere Browser: ein ZIP als Rückfallebene
 */
export async function downloadFolder(
  load: () => Promise<{ name?: string; items?: DownloadItem[]; error?: string }>,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
) {
  // Ordnerauswahl muss direkt nach dem Klick kommen (Browser-Regel) – erst danach die Liste laden
  const picker = canSaveFolders() ? (window as unknown as { showDirectoryPicker: Picker }).showDirectoryPicker : null;
  const root = picker ? await picker({ id: "qd-downloads", mode: "readwrite", startIn: "downloads" }) : null;
  const list = await load();
  if (list.error || !list.items?.length) throw new Error(list.error ?? "Keine Dateien.");
  const name = list.name ?? "Dateien";
  const items = list.items;
  const totalBytes = items.reduce((s, i) => s + i.size, 0);
  const state: DownloadProgress = { done: 0, total: items.length, bytes: 0, totalBytes, mode: root ? "ordner" : "zip" };
  const emit = () => onProgress({ ...state });

  if (root) {
    const target = await root.getDirectoryHandle(clean(name), { create: true });
    const dirs = new Map<string, Promise<DirHandle>>([["", Promise.resolve(target)]]);
    const dirOf = (path: string): Promise<DirHandle> => {
      const hit = dirs.get(path);
      if (hit) return hit;
      const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      const leaf = path.slice(path.lastIndexOf("/") + 1);
      const p = dirOf(parent).then((d) => d.getDirectoryHandle(clean(leaf), { create: true }));
      dirs.set(path, p);
      return p;
    };
    emit();
    await pool(items, 4, async (it) => {
      if (signal?.aborted) return;
      const parts = it.path.split("/");
      const file = clean(parts.pop()!);
      const dir = await dirOf(parts.join("/"));
      const res = await fetch(it.url, { signal });
      if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen: ${it.path}`);
      const handle = await dir.getFileHandle(file, { create: true });
      const out = await handle.createWritable();
      await res.body
        .pipeThrough(
          counter((n) => {
            state.bytes += n;
            emit();
          }),
        )
        .pipeTo(out, { signal });
      state.done++;
      emit();
    });
    return;
  }

  // Rückfallebene: ZIP im Browser erzeugen
  const { downloadZip } = await import("client-zip");
  emit();
  async function* entries() {
    for (const it of items) {
      if (signal?.aborted) return;
      const res = await fetch(it.url, { signal });
      if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen: ${it.path}`);
      const body = res.body.pipeThrough(
        counter((n) => {
          state.bytes += n;
          emit();
        }),
      );
      yield { name: `${clean(name)}/${it.path}`, input: new Response(body), size: it.size };
      state.done++;
      emit();
    }
  }
  const blob = await downloadZip(entries()).blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${clean(name)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}
