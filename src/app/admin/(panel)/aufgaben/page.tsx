import Link from "next/link";
import { AlarmClock, CalendarClock, CheckCircle2, CircleDot, LayoutGrid, List } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getTask, listTasks, taskBadge } from "@/lib/tasks/server";
import { db } from "@/lib/supabase/admin";
import { dueInfo } from "@/lib/tasks/shared";
import { customerOptionsForFolders, projectOptions, teamMembers } from "@/lib/files/server";
import { isR2Configured } from "@/lib/files/r2";
import { TaskBoard } from "@/components/admin/tasks/TaskBoard";
import { TaskPanel } from "@/components/admin/tasks/TaskPanel";
import { NewTaskButton } from "@/components/admin/tasks/NewTaskButton";
import { Avatar } from "@/components/admin/tasks/TaskBits";
import { PageHeader, SearchForm } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Aufgaben" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const me = admin.email.toLowerCase();
  const view = sp.ansicht === "board" ? "board" : "liste";
  const wer = sp.wer ?? "mich";
  const assignee = wer === "alle" ? undefined : wer === "mich" ? me : wer.toLowerCase();
  const q = sp.q?.slice(0, 80);
  const [tasks, team, customers, projects, detail, badge] = await Promise.all([
    listTasks({ assignee, q }),
    teamMembers(),
    customerOptionsForFolders(),
    projectOptions(),
    sp.aufgabe && /^[0-9a-f-]{36}$/.test(sp.aufgabe) ? getTask(sp.aufgabe) : Promise.resolve(null),
    taskBadge(me),
  ]);
  // geöffnete Aufgabe gilt als gelesen
  if (detail) await db().from("task_seen").upsert({ task_id: detail.task.id, email: me, seen_at: new Date().toISOString() }, { onConflict: "task_id,email" });
  const unread = badge.unread.filter((id) => id !== detail?.task.id);
  const openList = tasks.filter((t) => t.status !== "erledigt");
  const stats = {
    open: openList.length,
    today: openList.filter((t) => dueInfo(t.due_date, false)?.label === "Heute").length,
    overdue: openList.filter((t) => dueInfo(t.due_date, false)?.tone === "red").length,
    working: tasks.filter((t) => t.status === "in_arbeit").length,
    done: tasks.filter((t) => t.status === "erledigt").length,
  };
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ansicht: view === "board" ? "board" : undefined, wer: wer === "mich" ? undefined : wer, q, ...patch })) if (v) p.set(k, v);
    return `/admin/aufgaben${p.size ? `?${p}` : ""}`;
  };
  const people = [{ key: "mich", label: "Meine", email: me }, { key: "alle", label: "Alle", email: null }, ...team.filter((m) => m.email !== me).map((m) => ({ key: m.email, label: m.name, email: m.email }))];

  return (
    <>
      <PageHeader
        title="Aufgaben"
        description="Zuweisen, Fälligkeit, Dateien und Notizen – Beteiligte sehen neue Aufgaben sofort in der Glocke und in der App."
        actions={<NewTaskButton team={team} customers={customers} me={me} />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["Offen", stats.open, CircleDot, "text-ink", "bg-white"],
            ["In Bearbeitung", stats.working, CalendarClock, "text-violet-700", "bg-violet-50"],
            ["Heute fällig", stats.today, AlarmClock, "text-amber-700", "bg-amber-50"],
            ["Überfällig", stats.overdue, AlarmClock, stats.overdue ? "text-red-600" : "text-stone-dark", stats.overdue ? "bg-red-50" : "bg-white"],
          ] as const
        ).map(([label, n, Icon, tone, bg]) => (
          <div key={label} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1 ring-ink/[0.06]", bg)}>
            <span className={cn("grid size-10 place-items-center rounded-xl bg-white/80 shadow-sm ring-1 ring-ink/[0.05]", tone)}>
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className={cn("block text-2xl font-bold tabular-nums leading-none", tone)}>{n}</span>
              <span className="mt-1 block text-xs text-stone-dark">{label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-ink/[0.06]">
        <div className="flex flex-wrap gap-1">
          {people.map((p) => {
            const m = p.email ? team.find((x) => x.email === p.email) : null;
            const active = wer === p.key;
            return (
              <Link key={p.key} href={href({ wer: p.key === "mich" ? undefined : p.key })} scroll={false} className={cn("inline-flex h-9 items-center gap-2 rounded-xl pl-1.5 pr-3 text-sm transition", active ? "bg-ink font-semibold text-white" : "text-stone-dark hover:bg-ink/[0.05] hover:text-ink", !p.email && "pl-3")}>
                {m ? <Avatar email={m.email} team={team} size={24} /> : null}
                {p.label}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl bg-ink/[0.05] p-1">
            <Link href={href({ ansicht: undefined })} scroll={false} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm", view === "liste" ? "bg-white font-semibold shadow-sm" : "text-stone-dark")}>
              <List className="size-4" aria-hidden /> Liste
            </Link>
            <Link href={href({ ansicht: "board" })} scroll={false} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm", view === "board" ? "bg-white font-semibold shadow-sm" : "text-stone-dark")}>
              <LayoutGrid className="size-4" aria-hidden /> Tafel
            </Link>
          </div>
          <SearchForm defaultValue={q} placeholder="Suchen …" hidden={{ ansicht: view === "board" ? "board" : undefined, wer: wer === "mich" ? undefined : wer }} />
        </div>
      </div>

      <TaskBoard tasks={tasks} team={team} view={view} unread={unread} />
      {!tasks.length ? (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-dark">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> {wer === "mich" ? "Keine Aufgaben für Sie – oben „Neue Aufgabe“ oder in einer Gruppe „Aufgabe hinzufügen“." : "Keine Aufgaben."}
        </p>
      ) : null}
      {detail ? <TaskPanel key={detail.task.id} data={detail} team={team} customers={customers} projects={projects} configured={isR2Configured()} /> : null}
    </>
  );
}
