"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileWarning, Loader2, Maximize2 } from "lucide-react";
import { formatBytes, type ViewerKind } from "@/lib/files/shared";
import { epsTiffPreview, heicToBlob, PREVIEW_SOURCE_LIMIT, previewsFromSource, psdToCanvas, tiffToCanvas, type Source } from "@/lib/files/preview-client";
import { savePreviews } from "@/lib/files/preview-upload";
import { cn } from "@/lib/utils";
import { PdfView } from "./PdfView";

type Props = {
  fileId: string;
  kind: ViewerKind;
  /** Original (signierter Link) */
  url: string;
  /** Vorschaubild (klein, sofort da) – falls schon erzeugt */
  previewUrl: string | null;
  officeUrl: string | null;
  name: string;
  size: number;
  downloadUrl: string;
};

/** Einmalig Vorschau erzeugen und speichern (für ältere Dateien ohne Vorschau) */
function useBackfill(fileId: string, enabled: boolean) {
  const done = useRef(false);
  return (src: Source, pages?: number) => {
    if (!enabled || done.current) return;
    done.current = true;
    void previewsFromSource(src, pages)
      .then((p) => savePreviews(fileId, p))
      .catch(() => {});
  };
}

export function FileViewer(props: Props) {
  const { kind, previewUrl } = props;
  const [original, setOriginal] = useState(false);

  // Bildformate: zuerst die schnelle Vorschau, Original nur auf Wunsch
  if (previewUrl && !original && ["image", "tiff", "psd", "heic", "eps"].includes(kind)) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <ImageView src={previewUrl} name={props.name} />
        <button
          type="button"
          onClick={() => setOriginal(true)}
          className="absolute bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-4 py-2 text-xs text-white backdrop-blur hover:bg-black/85"
        >
          <Maximize2 className="size-3.5" aria-hidden /> Original in voller Auflösung laden ({formatBytes(props.size)})
        </button>
      </div>
    );
  }

  switch (kind) {
    case "image":
      return <OriginalImage {...props} />;
    case "pdf":
      return <PdfWithFallback {...props} />;
    case "video":
      return <video src={props.url} controls playsInline preload="metadata" className="max-h-full max-w-full rounded-xl bg-black" />;
    case "audio":
      return (
        <div className="w-full max-w-xl rounded-2xl bg-white/5 p-8 text-center">
          <p className="mb-5 truncate text-white/80">{props.name}</p>
          <audio src={props.url} controls preload="metadata" className="w-full" />
        </div>
      );
    case "office":
      return props.officeUrl ? <iframe title={props.name} src={props.officeUrl} className="h-full w-full rounded-xl bg-white" /> : <Fallback {...props} />;
    case "tiff":
    case "heic":
    case "psd":
    case "eps":
      return <DecodedImage {...props} />;
    case "text":
    case "csv":
      return <TextView {...props} />;
    case "zip":
      return <ZipView {...props} />;
    case "font":
      return <FontView {...props} />;
    default:
      return <Fallback {...props} />;
  }
}

function Fallback({ name, downloadUrl, title, children }: { name: string; downloadUrl: string; title?: string; children?: React.ReactNode }) {
  const ext = name.includes(".") ? name.split(".").pop()!.toUpperCase() : "Datei";
  return (
    <div className="max-w-md rounded-2xl bg-white/5 p-8 text-center text-white/80">
      <FileWarning className="mx-auto size-12 text-white/50" aria-hidden />
      <p className="mt-4 text-lg font-semibold text-white">{title ?? `Keine Browser-Vorschau für ${ext}`}</p>
      <div className="mt-2 text-sm">
        {children ?? `${ext}-Dateien kann der Browser nicht selbst anzeigen. Die Datei ist sicher gespeichert – laden Sie sie herunter und öffnen Sie sie im passenden Programm.`}
      </div>
      <a href={downloadUrl} className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
        Herunterladen
      </a>
    </div>
  );
}

function Spinner({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-white/70">
      <Loader2 className="size-8 animate-spin" aria-hidden />
      <span className="text-sm">{text}</span>
      {sub ? <span className="text-xs text-white/45">{sub}</span> : null}
    </div>
  );
}

/** Bild mit Zoom (Klick: einpassen ↔ Originalgröße) */
function ImageView({ src, name, crossOrigin, onLoad }: { src: string; name: string; crossOrigin?: boolean; onLoad?: (img: HTMLImageElement) => void }) {
  const [zoom, setZoom] = useState(false);
  return (
    <div className={cn("h-full w-full", zoom ? "overflow-auto" : "flex items-center justify-center")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        crossOrigin={crossOrigin ? "anonymous" : undefined}
        onLoad={(e) => onLoad?.(e.currentTarget)}
        onClick={() => setZoom((z) => !z)}
        className={cn("select-none", zoom ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain")}
        style={{ backgroundImage: "repeating-conic-gradient(#2a2a2e 0% 25%, #222226 0% 50%)", backgroundSize: "20px 20px" }}
      />
    </div>
  );
}

/** Original-Bild; erzeugt beim ersten Ansehen nebenbei die Vorschau */
function OriginalImage({ fileId, url, name, size, previewUrl }: Props) {
  const backfill = useBackfill(fileId, !previewUrl && size <= PREVIEW_SOURCE_LIMIT);
  return <ImageView src={url} name={name} crossOrigin onLoad={(img) => backfill(img)} />;
}

async function fetchBuffer(url: string, onProgress?: (p: number) => void) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Laden fehlgeschlagen (${res.status})`);
  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total) onProgress?.(loaded / total);
  }
  const out = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out.buffer;
}

/** TIFF / PSD / HEIC / EPS: Original laden und im Browser umwandeln (danach gibt es eine Vorschau) */
function DecodedImage({ fileId, kind, url, name, size, downloadUrl, previewUrl }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const backfill = useBackfill(fileId, !previewUrl);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const buf = await fetchBuffer(url, (p) => alive && setProgress(p));
        let canvas: HTMLCanvasElement | null = null;
        if (kind === "tiff") canvas = await tiffToCanvas(buf);
        else if (kind === "eps") {
          const tiff = epsTiffPreview(buf);
          if (!tiff) throw new Error("Diese EPS-Datei enthält keine eingebettete Vorschau.");
          canvas = await tiffToCanvas(tiff);
          setNote("Eingebettete Vorschau der EPS-Datei");
        } else if (kind === "psd") {
          const r = await psdToCanvas(buf);
          canvas = r.canvas;
          if (r.thumbnailOnly) setNote("Nur Miniatur verfügbar (PSD ohne „Kompatibilität maximieren“)");
        } else if (kind === "heic") {
          objectUrl = URL.createObjectURL(await heicToBlob(new Blob([buf])));
          if (alive) setSrc(objectUrl);
          return;
        }
        if (!canvas) throw new Error("Keine Vorschau möglich.");
        backfill(canvas);
        const blob = await new Promise<Blob | null>((res) => canvas!.toBlob(res, "image/png"));
        if (!blob) throw new Error("Keine Vorschau möglich.");
        objectUrl = URL.createObjectURL(blob);
        if (alive) setSrc(objectUrl);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Vorschau fehlgeschlagen.");
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, url]);
  if (error)
    return (
      <Fallback name={name} downloadUrl={downloadUrl} title="Vorschau nicht möglich">
        {error}
      </Fallback>
    );
  if (!src) return <Spinner text={progress < 1 ? `Original wird geladen … ${Math.round(progress * 100)} %` : "Vorschau wird erstellt …"} sub={`${formatBytes(size)} · ab dem nächsten Mal sofort sichtbar`} />;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <ImageView src={src} name={name} onLoad={kind === "heic" ? (img) => backfill(img) : undefined} />
      {note ? <span className="absolute bottom-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">{note}</span> : null}
    </div>
  );
}

function PdfWithFallback({ fileId, url, name, downloadUrl, previewUrl }: Props) {
  const [error, setError] = useState<string | null>(null);
  const backfill = useBackfill(fileId, !previewUrl);
  if (error)
    return (
      <Fallback name={name} downloadUrl={downloadUrl} title="Vorschau nicht möglich">
        {error}
      </Fallback>
    );
  return <PdfView url={url} onError={setError} onFirstPage={(canvas, pages) => backfill(canvas, pages)} />;
}

function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = [";", "\t", ","].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length && rows.length < 1000; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

/** Text/CSV: nur die ersten 2 MB laden */
function TextView({ kind, url, size, name, downloadUrl }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const limit = 2 * 1024 ** 2;
  useEffect(() => {
    let alive = true;
    fetch(url, { headers: size > limit ? { Range: `bytes=0-${limit - 1}` } : undefined })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Laden fehlgeschlagen (${r.status})`);
        const t = new TextDecoder("utf-8").decode(await r.arrayBuffer());
        if (alive) setText(t);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Fehler"));
    return () => {
      alive = false;
    };
  }, [url, size, limit]);
  if (error) return <Fallback name={name} downloadUrl={downloadUrl} title="Vorschau nicht möglich">{error}</Fallback>;
  if (text === null) return <Spinner text="Wird geladen …" />;
  if (kind === "csv") {
    const rows = parseCsv(text);
    return (
      <div className="h-full w-full overflow-auto rounded-xl bg-white text-ink">
        <table className="min-w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i === 0 ? "sticky top-0 bg-[#f4f2ed] font-semibold" : "border-t border-ink/[0.06]"}>
                <td className="px-2 py-1.5 text-right text-xs text-stone">{i + 1}</td>
                {r.map((c, j) => (
                  <td key={j} className="whitespace-nowrap px-3 py-1.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#18181b] p-5 font-mono text-[0.82rem] leading-relaxed text-white/90">
      {text}
      {size > limit ? `\n\n… (gekürzt – vollständige Datei herunterladen)` : ""}
    </pre>
  );
}

/* ---------------- ZIP: nur das Inhaltsverzeichnis per Range laden ---------------- */

async function rangeFetch(url: string, start: number, end: number): Promise<DataView> {
  const r = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
  if (!r.ok) throw new Error(`Laden fehlgeschlagen (${r.status})`);
  return new DataView(await r.arrayBuffer());
}

async function listZip(url: string, size: number): Promise<{ name: string; size: number }[]> {
  const tailLen = Math.min(size, 65557);
  const tail = await rangeFetch(url, size - tailLen, size - 1);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Kein gültiges ZIP-Archiv.");
  let cdSize = tail.getUint32(eocd + 12, true);
  let cdOffset = tail.getUint32(eocd + 16, true);
  // ZIP64
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    const loc = eocd - 20;
    if (loc >= 0 && tail.getUint32(loc, true) === 0x07064b50) {
      const z64 = Number(tail.getBigUint64(loc + 8, true));
      const rec = await rangeFetch(url, z64, z64 + 55);
      cdSize = Number(rec.getBigUint64(40, true));
      cdOffset = Number(rec.getBigUint64(48, true));
    }
  }
  const cd = await rangeFetch(url, cdOffset, cdOffset + cdSize - 1);
  const dec = new TextDecoder("utf-8");
  const out: { name: string; size: number }[] = [];
  let p = 0;
  while (p + 46 <= cd.byteLength && cd.getUint32(p, true) === 0x02014b50) {
    let usize = cd.getUint32(p + 24, true);
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    if (usize === 0xffffffff) {
      let e = p + 46 + nameLen;
      const end = e + extraLen;
      while (e + 4 <= end) {
        const id = cd.getUint16(e, true);
        const len = cd.getUint16(e + 2, true);
        if (id === 0x0001 && len >= 8) usize = Number(cd.getBigUint64(e + 4, true));
        e += 4 + len;
      }
    }
    out.push({ name, size: usize });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function ZipView({ url, name, size, downloadUrl }: Props) {
  const [entries, setEntries] = useState<{ name: string; size: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    listZip(url, size)
      .then((list) => alive && setEntries(list.sort((a, b) => a.name.localeCompare(b.name, "de"))))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Archiv konnte nicht gelesen werden."));
    return () => {
      alive = false;
    };
  }, [url, size]);
  if (error) return <Fallback name={name} downloadUrl={downloadUrl} title="Archiv nicht lesbar">{error}</Fallback>;
  if (!entries) return <Spinner text="Inhalt wird gelesen …" />;
  const files = entries.filter((e) => !e.name.endsWith("/"));
  return (
    <div className="h-full w-full max-w-3xl overflow-auto rounded-xl bg-white text-ink">
      <p className="sticky top-0 border-b border-ink/[0.06] bg-[#f4f2ed] px-4 py-3 text-sm font-semibold">
        {files.length} Dateien im Archiv · {formatBytes(files.reduce((s, f) => s + f.size, 0))} entpackt
      </p>
      <ul className="divide-y divide-ink/[0.05] text-sm">
        {files.map((e) => (
          <li key={e.name} className="flex justify-between gap-4 px-4 py-2">
            <span className="min-w-0 truncate">{e.name}</span>
            <span className="shrink-0 tabular-nums text-stone-dark">{formatBytes(e.size)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FontView({ url, name, downloadUrl }: Props) {
  const family = `qd-font-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [state, setState] = useState<"laedt" | "ok" | "fehler">("laedt");
  useEffect(() => {
    const face = new FontFace(family, `url(${url})`);
    face
      .load()
      .then((f) => {
        document.fonts.add(f);
        setState("ok");
      })
      .catch(() => setState("fehler"));
  }, [url, family]);
  if (state === "fehler") return <Fallback name={name} downloadUrl={downloadUrl} title="Schrift nicht lesbar" />;
  if (state === "laedt") return <Spinner text="Schrift wird geladen …" />;
  return (
    <div className="h-full w-full overflow-auto rounded-xl bg-white p-8 text-ink" style={{ fontFamily: family }}>
      {[64, 40, 28, 18, 14].map((s) => (
        <p key={s} style={{ fontSize: s }} className="mb-4 leading-tight">
          {s >= 40 ? "QuickDesign Werbung" : "Franz jagt im komplett verwahrlosten Taxi quer durch Bayern – 0123456789 äöüß €"}
        </p>
      ))}
      <p className="text-2xl tracking-wide">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz</p>
    </div>
  );
}
