"use client";

/**
 * Vorschaubilder im Browser erzeugen – beim Hochladen (die Datei liegt ja schon lokal vor)
 * oder einmalig beim ersten Ansehen. So muss später nie die ganze Datei geladen werden.
 */
import { viewerKind } from "./shared";

export const THUMB_MAX = 480;
export const PREVIEW_MAX = 1800;
/** Bis zu dieser Größe werden Vorschauen erzeugt (Dekodieren im Browser braucht Speicher) */
export const PREVIEW_SOURCE_LIMIT = 350 * 1024 ** 2;

export type Source = HTMLCanvasElement | ImageBitmap | HTMLImageElement;
export type Previews = { thumb: Blob; preview: Blob; width: number; height: number; pages?: number };

const dims = (s: Source) => ("naturalWidth" in s ? { w: s.naturalWidth, h: s.naturalHeight } : { w: s.width, h: s.height });

function scaled(src: Source, max: number): HTMLCanvasElement {
  const { w, h } = dims(src);
  const f = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * f));
  c.height = Math.max(1, Math.round(h * f));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src as CanvasImageSource, 0, 0, c.width, c.height);
  return c;
}

const toJpeg = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Bild konnte nicht erzeugt werden"))), "image/jpeg", q));

/** Aus einer fertigen Quelle (Bild/Canvas) Vorschau + Miniatur machen */
export async function previewsFromSource(src: Source, pages?: number): Promise<Previews> {
  const { w, h } = dims(src);
  const [preview, thumb] = await Promise.all([toJpeg(scaled(src, PREVIEW_MAX), 0.85), toJpeg(scaled(src, THUMB_MAX), 0.8)]);
  return { preview, thumb, width: w, height: h, pages };
}

/* ------------------------------ Dekoder ------------------------------ */

export async function tiffToCanvas(buf: ArrayBuffer): Promise<HTMLCanvasElement> {
  const mod = await import("utif");
  const UTIF = (mod as unknown as { default?: typeof mod }).default ?? mod;
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
export function epsTiffPreview(buf: ArrayBuffer): ArrayBuffer | null {
  const v = new DataView(buf);
  if (buf.byteLength < 30 || v.getUint32(0, false) !== 0xc5d0d3c6) return null;
  const start = v.getUint32(20, true);
  const len = v.getUint32(24, true);
  if (!start || !len || start + len > buf.byteLength) return null;
  return buf.slice(start, start + len);
}

export async function psdToCanvas(buf: ArrayBuffer): Promise<{ canvas: HTMLCanvasElement; thumbnailOnly: boolean }> {
  const { readPsd } = await import("ag-psd");
  const psd = readPsd(buf, { skipLayerImageData: true, skipLinkedFilesData: true });
  if (psd.canvas) return { canvas: psd.canvas, thumbnailOnly: false };
  const t = psd.imageResources?.thumbnail;
  if (t) return { canvas: t, thumbnailOnly: true };
  throw new Error("Die PSD enthält kein zusammengesetztes Bild.");
}

export async function heicToBlob(blob: Blob): Promise<Blob> {
  const heic2any = (await import("heic2any")).default;
  const out = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  return img;
}

export async function pdfFirstPage(data: { url?: string; buffer?: ArrayBuffer }): Promise<{ canvas: HTMLCanvasElement; pages: number }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  const task = pdfjs.getDocument(data.buffer ? { data: new Uint8Array(data.buffer) } : { url: data.url!, disableAutoFetch: true, disableStream: true });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, PREVIEW_MAX / Math.max(base.width, base.height)) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return { canvas, pages: doc.numPages };
  } finally {
    void task.destroy();
  }
}

/** Vorschau direkt aus einer lokalen Datei (beim Hochladen) */
export async function previewsFromFile(file: File): Promise<Previews | null> {
  if (file.size > PREVIEW_SOURCE_LIMIT) return null;
  const kind = viewerKind(file.name, file.type);
  try {
    switch (kind) {
      case "image": {
        const url = URL.createObjectURL(file);
        try {
          return await previewsFromSource(await loadImage(url));
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      case "tiff":
        return previewsFromSource(await tiffToCanvas(await file.arrayBuffer()));
      case "eps": {
        const tiff = epsTiffPreview(await file.arrayBuffer());
        return tiff ? previewsFromSource(await tiffToCanvas(tiff)) : null;
      }
      case "psd":
        return previewsFromSource((await psdToCanvas(await file.arrayBuffer())).canvas);
      case "heic": {
        const jpeg = await heicToBlob(file);
        const url = URL.createObjectURL(jpeg);
        try {
          return await previewsFromSource(await loadImage(url));
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      case "pdf": {
        const { canvas, pages } = await pdfFirstPage({ buffer: await file.arrayBuffer() });
        return previewsFromSource(canvas, pages);
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
