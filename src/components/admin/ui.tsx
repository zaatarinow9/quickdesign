import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-sm text-stone-dark">{eyebrow}</div> : null}
        <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-medium tracking-tight sm:text-[2rem]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[0.94rem] text-stone-dark">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ className, children, title, action, padded = true }: { className?: string; children: React.ReactNode; title?: React.ReactNode; action?: React.ReactNode; padded?: boolean }) {
  return (
    <section className={cn("adm-card", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-ink/[0.06] px-5 py-3.5">
          <h2 className="text-[0.95rem] font-semibold">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "ink",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "ink" | "accent" | "cyan" | "green" | "amber" | "red";
  href?: string;
}) {
  const tones = {
    ink: "bg-ink/[0.06] text-ink",
    accent: "bg-accent/10 text-accent",
    cyan: "bg-accent-2/10 text-[#1b7fae]",
    green: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    red: "bg-red-500/10 text-red-700",
  } as const;
  const body = (
    <div className="adm-card flex h-full items-start justify-between gap-3 p-5 transition-shadow hover:shadow-md">
      <div className="min-w-0">
        <p className="text-[0.8rem] text-stone-dark">{label}</p>
        <p className="mt-1.5 truncate font-[family-name:var(--font-display)] text-[1.6rem] font-medium leading-tight tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-[0.78rem] text-stone-dark">{hint}</p> : null}
      </div>
      {Icon ? (
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tones[tone])}>
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  );
}

const BADGE_TONES = {
  gray: "bg-ink/[0.06] text-stone-dark",
  blue: "bg-sky-500/10 text-sky-700",
  green: "bg-emerald-500/10 text-emerald-700",
  amber: "bg-amber-500/12 text-amber-800",
  red: "bg-red-500/10 text-red-700",
  pink: "bg-accent/10 text-accent",
  violet: "bg-violet-500/10 text-violet-700",
} as const;
export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "gray", children, className }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.74rem] font-medium", BADGE_TONES[tone], className)}>{children}</span>;
}

export const statusTone: Record<string, BadgeTone> = {
  entwurf: "gray",
  versendet: "blue",
  angenommen: "green",
  abgelehnt: "red",
  abgelaufen: "amber",
  offen: "blue",
  teilbezahlt: "violet",
  bezahlt: "green",
  storniert: "gray",
  ueberfaellig: "red",
  neu: "pink",
  in_bearbeitung: "blue",
  erledigt: "green",
  archiviert: "gray",
  lead: "amber",
  kunde: "green",
  inaktiv: "gray",
  keine: "gray",
  ausstehend: "amber",
  bestaetigt: "green",
  abgemeldet: "red",
};

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-ink/[0.05]">
        <Icon className="size-6 text-stone-dark" aria-hidden />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      {text ? <p className="mt-1 max-w-sm text-sm text-stone-dark">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn" | "error"; children: React.ReactNode }) {
  const tones = {
    info: "bg-sky-50 text-sky-900 ring-sky-200",
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    warn: "bg-amber-50 text-amber-900 ring-amber-200",
    error: "bg-red-50 text-red-900 ring-red-200",
  };
  return <div className={cn("rounded-xl px-4 py-3 text-sm ring-1", tones[tone])}>{children}</div>;
}

export function Pagination({ page, total, pageSize, hrefFor }: { page: number; total: number; pageSize: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink/[0.06] px-5 py-3 text-sm text-stone-dark">
      <span>
        Seite {page} von {pages} · {total} Einträge
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="adm-btn adm-btn-ghost adm-btn-sm" href={hrefFor(page - 1)}>
            Zurück
          </Link>
        ) : null}
        {page < pages ? (
          <Link className="adm-btn adm-btn-ghost adm-btn-sm" href={hrefFor(page + 1)}>
            Weiter
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Filter-Reiter als Links (Server-seitig) */
export function FilterTabs({ items, active }: { items: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Filter">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={cn(
            "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors",
            active === it.key ? "bg-ink text-paper" : "text-stone-dark hover:bg-ink/[0.05] hover:text-ink",
          )}
        >
          {it.label}
          {typeof it.count === "number" ? <span className={cn("text-xs", active === it.key ? "text-paper/70" : "text-stone")}>{it.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function SearchForm({ defaultValue, placeholder, hidden }: { defaultValue?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form className="relative w-full sm:w-72" role="search">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="adm-input pl-9" aria-label={placeholder} />
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </form>
  );
}
