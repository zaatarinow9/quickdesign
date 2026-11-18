"use client";

import { useEffect, useId, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { formatBytes, type ViewerKind } from "@/lib/files/shared";
import { cn } from "@/lib/utils";
import { PdfView } from "./PdfView";

/** Größe, bis zu der Dateien im Browser dekodiert werden (TIFF, PSD, HEIC, EPS, ZIP) */
const DECODE_LIMIT = 400 * 1024 ** 2;

type Props = { kind: ViewerKind; url: string; officeUrl: string | null; name: string; size: number; downloadUrl: string };

export function FileViewer(props: Props) {
  const { kind, size } = props;
  const heavy = ["tiff", "heic", "psd", "eps", "zip"].includes(kind) && size > DECODE_LIMIT;
  const [force, setForce] = useState(false);
  if (heavy && !force) {
    return (
      <Fallback name={props.name} downloadUrl={props.downloadUrl} title="Sehr große Datei">
        Die Datei ist {formatBytes(size)} groß. Die Vorschau lädt die ganze Datei in den Browser.
        <button type="button" onClick={() => setForce(true)} className="mt-4 block rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
          Vorschau trotzdem laden
        </button>
      </Fallback>
    );
  }
  switch (kind) {
    case "image":
      return <ImageView src={props.url} name={props.name} />;
    case "pdf":
      return <PdfWithFallback {...props} />;
    case "video":
      return <video src={props.url} controls playsInline className="max-h-full max-w-full rounded-xl bg-black" />;
    case "audio":
      return (
        <div className="w-full max-w-xl rounded-2xl bg-white/5 p-8 text-center">
          <p className="mb-5 truncate text-white/80">{props.name}</p>
          <audio src={props.url} controls className="w-full" />
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

function Spinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-white/70">
      <Loader2 className="size-8 animate-spin" aria-hidden />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/** Bild mit Zoom (Klick: einpassen ↔ Originalgröße) */
function ImageView({ src, name }: { src: string; name: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <div className={cn("h-full w-full", zoom ? "overflow-auto" : "flex items-center justify-center")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        onClick={() => setZoom((z) => !z)}
        className={cn("select-none", zoom ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain")}
        style={{ backgroundImage: "repeating-conic-gradient(#2a2a2e 0% 25%, #222226 0% 50%)", backgroundSize: "20px 20px" }}
      />
    </div>
  );
}

async function fetchBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Laden fehlgeschlagen (${res.status})`);
  return res.arrayBuffer();
}

/** TIFF/EPS-Vorschau: erste Seite dekodieren */
async function tiffToCanvas(buf: ArrayBuffer): Promise<HTMLCanvasElement> {
  const UTIF = (await import("utif")).default ?? (await import("utif"));
  const ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error("Kein Bild gefunden");
  const page = ifds.reduce((a, b) => ((b.width as number) * (b.height as number) > (a.width as number) * (a.height as number) ? b : a));
  UTIF.decodeImage(buf, page);
  const rgba = UTIF.toRGBA8(page);
  const canvas = document.createElement("canvas");
  canvas.width = page.width as number;
  canvas.height = page.height as number;
  canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), canvas.width, canvas.height), 0, 0);
  return canvas;
}

/** DOS-EPS enthält oft eine TIFF-Vorschau (Header C5 D0 D3 C6) */
function epsTiffPreview(buf: ArrayBuffer): ArrayBuffer | null {
  const v = new DataView(buf);
  if (buf.byteLength < 30 || v.getUint32(0, false) !== 0xc5d0d3c6) return null;
  const start = v.getUint32(20, true);
  const len = v.getUint32(24, true);
  if (!start || !len || start + len > buf.byteLength) return null;
  return buf.slice(start, start + len);
}

function DecodedImage({ kind, url, name, downloadUrl }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const buf = await fetchBuffer(url);
        let canvas: HTMLCanvasElement | null = null;
        if (kind === "tiff") canvas = await tiffToCanvas(buf);
        else if (kind === "eps") {
          const tiff = epsTiffPreview(buf);
          if (!tiff) throw new Error("Diese EPS-Datei enthält keine eingebettete Vorschau.");
          canvas = await tiffToCanvas(tiff);
          setNote("Eingebettete Vorschau der EPS-Datei");
        } else if (kind === "psd") {
          const { readPsd } = await import("ag-psd");
          const psd = readPsd(buf, { skipLayerImageData: true, skipLinkedFilesData: true });
          canvas = psd.canvas ?? psd.imageResources?.thumbnail ?? null;
          if (!psd.canvas && canvas) setNote("Nur Miniatur verfügbar (PSD ohne „Kompatibilität maximieren“)");
          if (!canvas) throw new Error("Die PSD enthält kein zusammengesetztes Bild.");
        } else if (kind === "heic") {
          const heic2any = (await import("heic2any")).default;
          const out = await heic2any({ blob: new Blob([buf]), toType: "image/jpeg", quality: 0.9 });
          objectUrl = URL.createObjectURL(Array.isArray(out) ? out[0] : out);
          if (alive) setSrc(objectUrl);
          return;
        }
        if (!canvas) throw new Error("Keine Vorschau möglich.");
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
  }, [kind, url]);
  if (error)
    return (
      <Fallback name={name} downloadUrl={downloadUrl} title="Vorschau nicht möglich">
        {error}
      </Fallback>
    );
  if (!src) return <Spinner text="Vorschau wird erstellt …" />;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <ImageView src={src} name={name} />
      {note ? <span className="absolute bottom-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">{note}</span> : null}
    </div>
  );
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
    }
    else if (c === "\n" || c === "\r") {
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

function TextView({ kind, url, size, name, downloadUrl }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const limit = 5 * 1024 ** 2;
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Laden fehlgeschlagen (${r.status})`);
        const buf = await r.arrayBuffer();
        const t = new TextDecoder("utf-8").decode(buf.slice(0, limit));
        if (alive) setText(t);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Fehler"));
    return () => {
      alive = false;
    };
  }, [url, limit]);
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

function ZipView({ url, name, downloadUrl }: Props) {
  const [entries, setEntries] = useState<{ name: string; size: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const buf = new Uint8Array(await fetchBuffer(url));
        const { unzipSync } = await import("fflate");
        const list: { name: string; size: number }[] = [];
        unzipSync(buf, {
          filter: (f) => {
            list.push({ name: f.name, size: f.originalSize });
            return false;
          },
        });
        if (alive) setEntries(list.sort((a, b) => a.name.localeCompare(b.name, "de")));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Archiv konnte nicht gelesen werden.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);
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

function PdfWithFallback(props: Props) {
  const [error, setError] = useState<string | null>(null);
  if (error)
    return (
      <Fallback name={props.name} downloadUrl={props.downloadUrl} title="Vorschau nicht möglich">
        {error}
      </Fallback>
    );
  return <PdfView url={props.url} onError={setError} />;
}
