import Link from "next/link";
import { Briefcase, CalendarDays, CalendarPlus, CalendarX2, Hammer, Receipt, TriangleAlert, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings/server";
import { addDays, formatEuro, todayBerlin } from "@/lib/documents/format";
import { financeByOffer, listAppointments, listProjects, teamInbox } from "@/lib/projects/server";
import { SendPlan } from "@/components/admin/projects/SendPlan";
import { db } from "@/lib/supabase/admin";
import { customerLabel, formatAppointment, projectHeading, projectStatuses, projectStatusInfo, type Project, type ProjectFinance } from "@/lib/projects/shared";
import { AppointmentAgenda } from "@/components/admin/projects/AppointmentCard";
import { QuickAdvance } from "@/components/admin/projects/QuickAdvance";
import { Badge, Card, EmptyState, FilterTabs, PageHeader, SearchForm, Stat } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Aufträge & Termine" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ ansicht?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const view = sp.ansicht === "abgeschlossen" ? "abgeschlossen" : "aktiv";
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const today = todayBerlin();
  const [projects, upcoming, settings] = await Promise.all([
    listProjects({ doneOnly: view === "abgeschlossen", q, kind: "auftrag" }),
    listAppointments(addDays(today, -14), addDays(today, 45)),
    getSettings(),
  ]);
  const finance = await financeByOffer(projects.map((p) => p.offer_id).filter((v): v is string => !!v));
  const fin = (p: Project) => (p.offer_id ? finance.get(p.offer_id) : undefined);

  // Einsatzplan: offene Termine ab heute + überfällige (Termin vorbei, Auftrag nicht abgeschlossen)
  const agenda = upcoming.filter((p) => (p.appointment_date! >= today ? true : p.status !== "abgeschlossen"));
  const weekEnd = addDays(today, 7);
  const thisWeek = agenda.filter((p) => p.appointment_date! >= today && p.appointment_date! < weekEnd);
  const collectWeek = thisWeek.reduce((s, p) => s + (p.collect_amount ?? 0), 0);
  const openTotal = [...finance.values()].reduce((s, f) => s + f.open, 0);
  const missingAppt = projects.filter((p) => p.status === "fertig" && !p.appointment_date);
  const notify = settings.notifications.customerStageMails;
  const tomorrow = addDays(today, 1);
  const { data: runs } = await db().from("daily_plan_runs").select("plan_date, sent_at").in("plan_date", [today, tomorrow]);
  const sentAt = (d: string) => runs?.find((r) => r.plan_date === d)?.sent_at as string | undefined;
  const timeOf = (iso: string) => new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso));
  const tomorrowCount = agenda.filter((p) => p.appointment_date === tomorrow && p.status !== "abgeschlossen").length;
  const todayCount = agenda.filter((p) => p.appointment_date === today && p.status !== "abgeschlossen").length;

  return (
    <>
      <PageHeader
        title="Aufträge & Termine"
        description="Angenommene Angebote landen automatisch hier. Oben die nächsten Termine, darunter alle Aufträge."
        actions={
          <Link href="/admin/projekte/neu" className="adm-btn adm-btn-primary">
            <CalendarPlus className="size-4" aria-hidden /> Neuer Termin
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aktive Aufträge" value={view === "aktiv" ? projects.length : "–"} icon={Briefcase} tone="ink" />
        <Stat label="Termine in 7 Tagen" value={thisWeek.length} hint={thisWeek[0] ? `Nächster: ${formatAppointment(thisWeek[0], { short: true })}` : "Keine Termine"} icon={CalendarDays} tone="accent" />
        <Stat label="Vor Ort kassieren (7 Tage)" value={formatEuro(collectWeek)} icon={Wallet} tone="amber" />
        <Stat label="Offene Rechnungsbeträge" value={formatEuro(openTotal)} hint="aus Rechnungen dieser Aufträge" icon={Receipt} tone="cyan" />
      </div>

      {view === "aktiv" ? (
        <Card className="mb-6" title="Einsatzplan" action={<span className="text-xs text-stone-dark">E-Mail an {teamInbox(settings)}</span>}>
          <div className="mb-5 grid gap-2 rounded-xl bg-ink/[0.03] p-3 sm:grid-cols-2">
            <SendPlan
              date={tomorrow}
              label="Plan für morgen"
              status={
                sentAt(tomorrow)
                  ? `gesendet um ${timeOf(sentAt(tomorrow)!)} Uhr`
                  : tomorrowCount
                    ? `${tomorrowCount} Aufgabe${tomorrowCount === 1 ? "" : "n"} · kommt automatisch um 18 Uhr`
                    : "morgen keine Termine"
              }
            />
            <SendPlan date={today} label="Plan für heute" status={todayCount ? `${todayCount} Aufgabe${todayCount === 1 ? "" : "n"} heute` : "heute keine Termine"} />
          </div>
          {agenda.length ? (
            <AppointmentAgenda items={agenda} today={today} />
          ) : (
            <EmptyState icon={CalendarX2} title="Keine Termine geplant" text="Termin in einem Auftrag eintragen – oder oben „Neuer Termin“ für alles andere." />
          )}
          {missingAppt.length ? (
            <div className="mt-6 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                <TriangleAlert className="size-4" aria-hidden /> Fertig, aber noch ohne Termin
              </p>
              <ul className="flex flex-wrap gap-2">
                {missingAppt.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/projekte/${p.id}`} className="inline-flex h-8 items-center rounded-full bg-white px-3 text-sm ring-1 ring-amber-200 hover:ring-amber-400">
                      {projectHeading(p)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          active={view}
          items={[
            { key: "aktiv", label: "Laufende Aufträge", href: "/admin/projekte" },
            { key: "abgeschlossen", label: "Abgeschlossen", href: "/admin/projekte?ansicht=abgeschlossen" },
          ]}
        />
        <SearchForm defaultValue={q} placeholder="Kunde, Titel, Ort, Nr. …" hidden={{ ansicht: view === "abgeschlossen" ? view : undefined }} />
      </div>

      {view === "aktiv" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {projectStatuses
            .filter((s) => s !== "abgeschlossen")
            .map((status) => {
              const list = projects.filter((p) => p.status === status);
              const sum = list.reduce((s, p) => s + p.value_gross, 0);
              return (
                <section key={status} className="rounded-2xl bg-ink/[0.025] p-3">
                  <header className="mb-3 flex items-center justify-between px-1">
                    <h2 className="flex items-center gap-2 font-semibold">
                      <span className={cn("size-2.5 rounded-full", status === "angenommen" ? "bg-sky-500" : status === "in_arbeit" ? "bg-amber-500" : "bg-emerald-500")} />
                      {projectStatusInfo[status].label}
                      <span className="text-sm font-normal text-stone-dark">{list.length}</span>
                    </h2>
                    <span className="text-xs tabular-nums text-stone-dark">{formatEuro(sum)}</span>
                  </header>
                  <div className="space-y-2.5">
                    {list.map((p) => (
                      <ProjectCard key={p.id} p={p} f={fin(p)} notify={notify && !!p.email} />
                    ))}
                    {!list.length ? <p className="px-1 py-6 text-center text-sm text-stone-dark">Keine Aufträge</p> : null}
                  </div>
                </section>
              );
            })}
        </div>
      ) : projects.length ? (
        <Card padded={false}>
          <ul className="divide-y divide-ink/[0.06]">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/projekte/${p.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-ink/[0.02]">
                  <span className="w-24 text-xs tabular-nums text-stone-dark">{p.number}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {projectHeading(p)}
                  </span>
                  <InvoiceBadge f={fin(p)} />
                  <span className="text-sm tabular-nums">{formatEuro(p.value_gross)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState icon={Hammer} title="Noch keine abgeschlossenen Aufträge" />
      )}
    </>
  );
}

function InvoiceBadge({ f }: { f?: ProjectFinance }) {
  if (!f || !f.invoices.length) return <Badge tone="gray">Noch keine Rechnung</Badge>;
  if (f.invoiced === 0) return <Badge tone="gray">Rechnung im Entwurf</Badge>;
  if (f.open <= 0.004) return <Badge tone="green">Bezahlt {formatEuro(f.paid)}</Badge>;
  return <Badge tone={f.paid > 0 ? "violet" : "blue"}>Offen {formatEuro(f.open)}</Badge>;
}

function ProjectCard({ p, f, notify }: { p: Project; f?: ProjectFinance; notify: boolean }) {
  const next = projectStatuses[projectStatuses.indexOf(p.status) + 1];
  return (
    <article className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-ink/[0.06] transition hover:shadow-md">
      <Link href={`/admin/projekte/${p.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[0.72rem] tabular-nums text-stone-dark">{p.number}</span>
          <span className="text-sm font-semibold tabular-nums">{formatEuro(p.value_gross)}</span>
        </div>
        <p className="mt-0.5 truncate font-medium">{customerLabel(p)}</p>
        <p className="truncate text-sm text-stone-dark">{p.title}</p>
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <InvoiceBadge f={f} />
        {p.appointment_date ? (
          <Badge tone="pink">
            <CalendarDays className="size-3" aria-hidden /> {formatAppointment(p, { short: true }).replace(/ \(.*\)$/, "")}
          </Badge>
        ) : null}
        {p.collect_amount ? <Badge tone="amber">Kassieren {formatEuro(p.collect_amount)}</Badge> : null}
      </div>
      {next ? (
        <div className="mt-2.5 flex justify-end border-t border-ink/[0.05] pt-2.5">
          <QuickAdvance id={p.id} next={next} notify={notify} />
        </div>
      ) : null}
    </article>
  );
}
