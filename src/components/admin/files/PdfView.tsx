"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; canvas: HTMLCanvasElement }) => { promise: Promise<void> };
};

/** PDF (und Illustrator .ai mit PDF-Kompatibilität) mit pdf.js – funktioniert auch auf Handys */
export function PdfView({ url, onError }: { url: string; onError: (msg: string) => void }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let loaded: PdfDoc | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        loaded = (await pdfjs.getDocument({ url }).promise) as unknown as PdfDoc;
        if (alive) setDoc(loaded);
      } catch (e) {
        if (alive) onError(e instanceof Error && /Invalid PDF/i.test(e.message) ? "Diese Datei enthält keine PDF-Daten (z. B. Illustrator-Datei ohne PDF-Kompatibilität)." : "Das PDF konnte nicht geöffnet werden.");
      }
    })();
    return () => {
      alive = false;
      void loaded?.destroy();
    };
  }, [url, onError]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div ref={box} className="min-h-0 flex-1 overflow-auto rounded-xl bg-[#26262a] py-4">
        {!doc ? (
          <div className="flex h-full items-center justify-center text-white/70">
            <Loader2 className="size-8 animate-spin" aria-hidden />
          </div>
        ) : (
          Array.from({ length: doc.numPages }, (_, i) => <PdfPageCanvas key={i} doc={doc} n={i + 1} width={Math.max(200, (width - 32) * zoom)} />)
        )}
      </div>
      {doc ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white backdrop-blur">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))} className="grid size-7 place-items-center rounded-full hover:bg-white/15" aria-label="Verkleinern">
            <Minus className="size-4" />
          </button>
          <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)} %</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.2))} className="grid size-7 place-items-center rounded-full hover:bg-white/15" aria-label="Vergrößern">
            <Plus className="size-4" />
          </button>
          <span className="px-2 text-white/70">
            {doc.numPages} Seite{doc.numPages === 1 ? "" : "n"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Eine Seite – wird erst gezeichnet, wenn sie in den sichtbaren Bereich kommt */
function PdfPageCanvas({ doc, n, width }: { doc: PdfDoc; n: number; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(n <= 2);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setVisible(true), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !width) return;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const canvas = ref.current;
      if (!canvas || cancelled) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [doc, n, width, visible]);

  return <canvas ref={ref} className="mx-auto mb-4 block bg-white shadow-lg" style={{ width, height: width * ratio }} aria-label={`Seite ${n}`} />;
}
