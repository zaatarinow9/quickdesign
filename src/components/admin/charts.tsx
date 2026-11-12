import { cn } from "@/lib/utils";

/**
 * Schlanke Balkendiagramme (eine Datenreihe, keine Legende nötig – der Titel benennt sie).
 * Hover-Tooltip je Balken, Trefferfläche über die volle Spaltenhöhe, Tabelle für Screenreader.
 */
export function BarChart({
  data,
  format,
  height = 200,
  caption,
  highlightLast = true,
}: {
  data: { label: string; value: number; sub?: string }[];
  format: (v: number) => string;
  height?: number;
  caption: string;
  highlightLast?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  return (
    <figure>
      <div className="relative flex gap-2" style={{ height }}>
        {/* y-Achse (zurückhaltend) */}
        <div className="relative w-14 shrink-0 text-right text-[0.7rem] text-stone">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: `${100 - (t / top) * 100}%` }}>
              {compact(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <span key={t} aria-hidden className="absolute inset-x-0 border-t border-ink/[0.06]" style={{ top: `${100 - (t / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => {
              const h = d.value > 0 ? Math.max(2, (d.value / top) * 100) : 0;
              const last = highlightLast && i === data.length - 1;
              return (
                <div key={d.label + i} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0} aria-label={`${d.label}: ${format(d.value)}`}>
                  <div
                    className={cn("w-full max-w-7 rounded-t-[4px] transition-colors", last ? "bg-accent" : "bg-ink/80 group-hover:bg-ink group-focus:bg-ink")}
                    style={{ height: `${h}%` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-paper shadow-lg group-hover:block group-focus:block">
                    <span className="block text-paper/60">{d.label}</span>
                    <span className="font-semibold tabular-nums">{format(d.value)}</span>
                    {d.sub ? <span className="block text-paper/60">{d.sub}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-16 mt-2 flex gap-[2px] text-[0.7rem] text-stone">
        {data.map((d, i) => (
          <span key={d.label + i} className="flex-1 truncate text-center">
            {data.length > 16 ? (i % 5 === 0 || i === data.length - 1 ? d.label : "") : d.label}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function niceTicks(max: number): number[] {
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return [0, step, step * 2, step * 3, step * 4].filter((t, i) => i === 0 || t - step < max);
}

function compact(v: number) {
  return new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

/** Horizontale Anteilsbalken (z. B. Top-Kunden, Quellen) */
export function RankList({ rows, format }: { rows: { label: string; value: number; href?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {r.href ? (
              <a href={r.href} className="truncate hover:text-accent">
                {r.label}
              </a>
            ) : (
              <span className="truncate">{r.label}</span>
            )}
            <span className="shrink-0 font-medium tabular-nums">{format(r.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-ink/[0.06]">
            <div className="h-full rounded-full bg-ink/70" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
