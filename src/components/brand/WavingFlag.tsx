/**
 * Fahne des freien Syrien – wehend (SMIL-Animation in einer statischen SVG-Datei).
 * Als Bilddatei statt Inline-SVG: wird einmal geladen und gecacht, statt jede Seite um ~18 KB aufzublähen.
 */
export function WavingFlag({ className = "", amp = 4, dur = 3, title }: { className?: string; amp?: number; dur?: number; title?: string }) {
  const strong = amp >= 5 || dur < 2.8;
  const src = strong ? "/brand/flag-5-26.svg" : "/brand/flag-4-3.svg";
  const h = strong ? 92 : 90;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={120} height={h} alt={title ?? ""} aria-hidden={title ? undefined : true} className={`qd-flag ${className}`} decoding="async" />
  );
}
