import Link from "next/link";
import { MapPin, Navigation, Phone, Wallet } from "lucide-react";
import { appointmentIcons } from "./AppointmentIcons";
import { formatEuro } from "@/lib/documents/format";
import {
  appointmentInfo,
  customerLabel,
  formatDayHeading,
  hhmm,
  mapsUrl,
  navigationUrl,
  projectStatusInfo,
  siteAddress,
  type Project,
} from "@/lib/projects/shared";
import { Badge } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** Ein Termin im Einsatzplan – mit Route, Karte, Anruf und Betrag zum Kassieren */
export function AppointmentCard({ p, compact }: { p: Project; compact?: boolean }) {
  const type = p.appointment_type ?? "montage";
  const Icon = appointmentIcons[type];
  const address = siteAddress(p);
  const nav = navigationUrl(p);
  const map = mapsUrl(p);
  const tel = p.site_contact_phone || p.phone;
  const done = p.status === "abgeschlossen";
  return (
    <article className={cn("flex min-w-0 gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-ink/[0.07] sm:gap-4 sm:p-4", done && "opacity-60")}>
      <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 pt-0.5 sm:w-16">
        <span className={cn("grid size-10 place-items-center rounded-xl", type === "montage" ? "bg-accent/10 text-accent" : type === "lieferung" ? "bg-sky-500/10 text-sky-700" : "bg-amber-500/10 text-amber-700")}>
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="font-[family-name:var(--font-display)] text-base font-semibold tabular-nums">{hhmm(p.appointment_time) ?? "–"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-stone-dark">{appointmentInfo[type].label}</span>
          {p.duration_hours ? <span className="text-xs text-stone-dark">· ca. {String(p.duration_hours).replace(".", ",")} Std.</span> : null}
          <Badge tone={projectStatusInfo[p.status].tone}>{projectStatusInfo[p.status].label}</Badge>
        </div>
        <Link href={`/admin/projekte/${p.id}`} className="mt-0.5 line-clamp-2 block font-semibold hover:text-accent">
          {customerLabel(p)} – {p.title}
        </Link>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-dark">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0">{type === "abholung" ? "Abholung im Laden" : address || <em>Kein Einsatzort hinterlegt</em>}</span>
        </p>
        {(p.site_contact_name || tel) && !compact ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-dark">
            <Phone className="size-3.5 shrink-0" aria-hidden /> {[p.site_contact_name || p.customer_name, tel].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {p.crew_notes && !compact ? <p className="mt-2 line-clamp-3 whitespace-pre-line rounded-lg bg-ink/[0.03] px-3 py-2 text-sm">{p.crew_notes}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {p.collect_amount ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-sm font-semibold text-white">
              <Wallet className="size-3.5" aria-hidden /> Kassieren: {formatEuro(p.collect_amount)}
            </span>
          ) : null}
          {type !== "abholung" && nav ? (
            <a href={nav} target="_blank" rel="noopener" className="adm-btn adm-btn-ghost adm-btn-sm">
              <Navigation className="size-3.5" aria-hidden /> Route
            </a>
          ) : null}
          {type !== "abholung" && map && !compact ? (
            <a href={map} target="_blank" rel="noopener" className="adm-btn adm-btn-ghost adm-btn-sm">
              <MapPin className="size-3.5" aria-hidden /> Karte
            </a>
          ) : null}
          {tel ? (
            <a href={`tel:${tel.replace(/[^\d+]/g, "")}`} className="adm-btn adm-btn-ghost adm-btn-sm">
              <Phone className="size-3.5" aria-hidden /> Anrufen
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Termine nach Tagen gruppiert */
export function AppointmentAgenda({ items, today, compact }: { items: Project[]; today: string; compact?: boolean }) {
  const days = new Map<string, Project[]>();
  for (const p of items) {
    if (!p.appointment_date) continue;
    days.set(p.appointment_date, [...(days.get(p.appointment_date) ?? []), p]);
  }
  return (
    <div className="space-y-6">
      {[...days.entries()].map(([date, list]) => {
        const collect = list.reduce((s, p) => s + (p.collect_amount ?? 0), 0);
        return (
          <section key={date}>
            <header className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={cn("font-semibold", date === today && "text-accent", date < today && "text-red-700")}>
                {formatDayHeading(date, today)}
                {date < today ? " · überfällig" : ""}
              </h3>
              <span className="text-xs text-stone-dark">
                {list.length} Termin{list.length === 1 ? "" : "e"}
                {collect ? ` · ${formatEuro(collect)} kassieren` : ""}
              </span>
            </header>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {list.map((p) => (
                <AppointmentCard key={p.id} p={p} compact={compact} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
