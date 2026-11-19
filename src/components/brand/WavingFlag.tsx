/**
 * Fahne des freien Syrien als leichtes, animiertes SVG (SMIL – ohne JavaScript).
 * Für Hauptseite (Header-Chip, Startseite); respektiert „reduzierte Bewegung“ über CSS.
 */
const W = 120;
const H = 80;
const FRAMES = 6;

function wavePath(y0: number, y1: number, phase: number, amp: number) {
  const steps = 24;
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (W * i) / steps;
    const k = i / steps;
    const d = Math.sin(k * Math.PI * 2 * 1.1 - phase) * amp * (0.25 + k * 0.75);
    top.push(`${x.toFixed(1)},${(y0 + d).toFixed(1)}`);
    bot.unshift(`${x.toFixed(1)},${(y1 + d).toFixed(1)}`);
  }
  return `M${top.join("L")}L${bot.join("L")}Z`;
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.4;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export function WavingFlag({ className = "", amp = 4, dur = 3.2, title }: { className?: string; amp?: number; dur?: number; title?: string }) {
  const values = (y0: number, y1: number) =>
    Array.from({ length: FRAMES + 1 }, (_, f) => wavePath(y0, y1, (f / FRAMES) * Math.PI * 2, amp)).join(";");
  const third = H / 3;
  const starY = (i: number) => (f: number) => {
    const k = (0.3 + i * 0.2);
    return (third * 1.5 + Math.sin(k * Math.PI * 2 * 1.1 - (f / FRAMES) * Math.PI * 2) * amp * (0.25 + k * 0.75)).toFixed(1);
  };
  return (
    <svg viewBox={`0 ${-amp - 1} ${W} ${H + amp * 2 + 2}`} className={`qd-flag ${className}`} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id="qd-flag-shade" x1="0" x2="1">
          {Array.from({ length: 7 }, (_, i) => (
            <stop key={i} offset={i / 6} stopColor="#000" stopOpacity={i % 2 ? 0.14 : 0} />
          ))}
        </linearGradient>
      </defs>
      {[
        ["#0b7a3e", 0, third + 0.6],
        ["#f4f2ed", third, 2 * third + 0.6],
        ["#111111", 2 * third, H],
      ].map(([c, y0, y1]) => (
        <path key={c as string} fill={c as string} d={wavePath(y0 as number, y1 as number, 0, amp)}>
          <animate attributeName="d" dur={`${dur}s`} repeatCount="indefinite" values={values(y0 as number, y1 as number)} />
        </path>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path fill="#ce1126" d={star(W * (0.3 + i * 0.2), third * 1.5, third * 0.32)}>
            <animateTransform
              attributeName="transform"
              type="translate"
              dur={`${dur}s`}
              repeatCount="indefinite"
              values={Array.from({ length: FRAMES + 1 }, (_, f) => `0 ${(Number(starY(i)(f)) - third * 1.5).toFixed(1)}`).join(";")}
            />
          </path>
        </g>
      ))}
      <path fill="url(#qd-flag-shade)" d={wavePath(0, H, 0, amp)}>
        <animate attributeName="d" dur={`${dur}s`} repeatCount="indefinite" values={values(0, H)} />
      </path>
    </svg>
  );
}
