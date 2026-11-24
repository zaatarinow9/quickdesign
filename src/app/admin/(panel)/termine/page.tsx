import Link from "next/link";
import { CalendarCheck2, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, List, UsersRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAppointment, listAppointments } from "@/lib/appointments/server";
import { addDays, appointmentKindInfo, appointmentKinds, dayLabel, isoToBerlin, todayBerlin, weekStart } from "@/lib/appointments/shared";
import { customerOptionsForFolders, teamMembers } from "@/lib/files/server";
import { Calendar } from "@/components/admin/appointments/Calendar";
import { NewAppointmentButton } from "@/components/admin/appointments/NewAppointmentButton";
import { Avatar } from "@/components/admin/tasks/TaskBits";
import { PageHeader } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Termine" };

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const me = admin.email.toLowerCase();
  const today = todayBerlin();
  const view = sp.ansicht === "tag" ? "tag" : sp.ansicht === "liste" ? "liste" : "woche";
  const anchor = sp.datum && dateRe.test(sp.datum) ? sp.datum : today;
  const wer = sp.wer ?? "alle";
  const staff = wer === "alle" ? undefined : wer === "mich" ? me : wer.toLowerCase();
  const from = view === "woche" ? weekStart(anchor) : anchor;
  const days = view === "woche" ? 7 : view === "tag" ? 1 : 30;
  const to = addDays(from, days);

  const [items, team, customers, open, todayItems] = await Promise.all([
    listAppointments({ from, to, staff }),
    teamMembers(),
    customerOptionsForFolders(),
    sp.termin && /^[0-9a-f-]{36}$/.test(sp.termin) ? getAppointment(sp.termin) : Promise.resolve(null),
    listAppointments({ from: today, to: addDays(today, 7), staff: me, withProjects: false }),
  ]);
  const active = todayItems.filter((i) => i.source === "termin" && (i.item.status === "geplant" || i.item.status === "bestaetigt"));
  const mineToday = active.filter((i) => isoToBerlin(i.item.starts_at).date === today);
  const next = active.find((i) => i.item.ends_at > new Date().toISOString());
  const openCount = items.filter((i) => i.source === "termin" && i.item.status === "geplant").length;

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ansicht: view === "woche" ? undefined : view, datum: anchor === today ? undefined : anchor, wer: wer === "alle" ? undefined : wer, ...patch })) if (v) p.set(k, v);
    return `/admin/termine${p.size ? `?${p}` : ""}`;
  };
  const step = view === "woche" ? 7 : view === "tag" ? 1 : 30;
  const rangeLabel = view === "tag" ? dayLabel(from, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : `${dayLabel(from, { day: "numeric", month: "short" })} – ${dayLabel(addDays(to, -1), { day: "numeric", month: "short", year: "numeric" })}`;
  const people = [{ key: "alle", label: "Alle", email: null as string | null }, { key: "mich", label: "Meine", email: me }, ...team.filter((m) => m.email !== me).map((m) => ({ key: m.email, label: m.name, email: m.email }))];
  const newDefaults = sp.neu ? { date: sp.datum && dateRe.test(sp.datum) ? sp.datum : today, start: sp.zeit && /^\d{2}:\d{2}$/.test(sp.zeit) ? sp.zeit : undefined, customerId: sp.kunde && /^[0-9a-f-]{36}$/.test(sp.kunde) ? sp.kunde : undefined } : null;

  return (
    <>
      <PageHeader title="Termine" description="Beratungen, Besprechungen, Aufmaß, Montage – mit Mitarbeiter, Kunde und worum es geht. Alles erscheint auch in der App." actions={<NewAppointmentButton />} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={CalendarCheck2} label="Meine Termine heute" value={String(mineToday.length)} tone="text-accent" bg="bg-accent/[0.06]" />
        <Kpi icon={Clock} label="Mein nächster Termin" value={next ? `${dayLabel(isoToBerlin(next.item.starts_at).date, { weekday: "short" })} ${isoToBerlin(next.item.starts_at).time}` : "–"} tone="text-ink" bg="bg-white" />
        <Kpi icon={CalendarRange} label={view === "woche" ? "Termine diese Ansicht" : "Termine im Zeitraum"} value={String(items.length)} tone="text-sky-700" bg="bg-sky-50" />
        <Kpi icon={UsersRound} label="Noch nicht bestätigt" value={String(openCount)} tone={openCount ? "text-amber-700" : "text-stone-dark"} bg={openCount ? "bg-amber-50" : "bg-white"} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-ink/[0.06]">
        <div className="flex items-center gap-1">
          <Link href={href({ datum: addDays(anchor, -step) })} scroll={false} className="grid size-9 place-items-center rounded-xl hover:bg-ink/[0.05]" aria-label="Zurück">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={href({ datum: undefined })} scroll={false} className="h-9 rounded-xl px-3 text-sm font-semibold leading-9 ring-1 ring-ink/10 hover:bg-ink/[0.03]">
            Heute
          </Link>
          <Link href={href({ datum: addDays(anchor, step) })} scroll={false} className="grid size-9 place-items-center rounded-xl hover:bg-ink/[0.05]" aria-label="Weiter">
            <ChevronRight className="size-4" />
          </Link>
          <span className="ml-2 font-semibold">{rangeLabel}</span>
        </div>
        <div className="ml-auto flex rounded-xl bg-ink/[0.05] p-1">
          {(
            [
              ["woche", "Woche", CalendarDays],
              ["tag", "Tag", CalendarCheck2],
              ["liste", "Liste", List],
            ] as const
          ).map(([k, label, Icon]) => (
            <Link key={k} href={href({ ansicht: k === "woche" ? undefined : k })} scroll={false} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm", view === k ? "bg-white font-semibold shadow-sm" : "text-stone-dark")}>
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1">
        {people.map((p) => {
          const m = p.email ? team.find((x) => x.email === p.email) : null;
          return (
            <Link key={p.key} href={href({ wer: p.key === "alle" ? undefined : p.key })} scroll={false} className={cn("inline-flex h-9 items-center gap-2 rounded-xl pr-3 text-sm transition", m ? "pl-1.5" : "pl-3", wer === p.key ? "bg-ink font-semibold text-white" : "text-stone-dark hover:bg-ink/[0.05] hover:text-ink")}>
              {m ? <Avatar email={m.email} team={team} size={24} /> : null}
              {p.label}
            </Link>
          );
        })}
        <span className="ml-auto hidden flex-wrap gap-3 text-xs text-stone-dark xl:flex">
          {appointmentKinds.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: appointmentKindInfo[k].color }} /> {appointmentKindInfo[k].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-slate-600" /> Auftrag
          </span>
        </span>
      </div>

      <Calendar key={`${from}-${view}-${wer}-${sp.termin ?? ""}-${sp.neu ?? ""}`} items={items} view={view} from={from} days={days} team={team} customers={customers} me={me} open={open} newDefaults={newDefaults} />
    </>
  );
}

function Kpi({ icon: Icon, label, value, tone, bg }: { icon: typeof Clock; label: string; value: string; tone: string; bg: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1 ring-ink/[0.06]", bg)}>
      <span className={cn("grid size-10 place-items-center rounded-xl bg-white/80 shadow-sm ring-1 ring-ink/[0.05]", tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate text-xl font-bold tabular-nums leading-none", tone)}>{value}</span>
        <span className="mt-1 block text-xs text-stone-dark">{label}</span>
      </span>
    </div>
  );
}
