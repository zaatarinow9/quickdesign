import Link from "next/link";
import { LayoutGrid, List, ListChecks } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getTask, listTasks } from "@/lib/tasks/server";
import { customerOptionsForFolders, projectOptions, teamMembers } from "@/lib/files/server";
import { isR2Configured } from "@/lib/files/r2";
import { TaskBoard } from "@/components/admin/tasks/TaskBoard";
import { TaskPanel } from "@/components/admin/tasks/TaskPanel";
import { NewTaskButton } from "@/components/admin/tasks/NewTaskButton";
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
  const [tasks, team, customers, projects, detail] = await Promise.all([
    listTasks({ assignee, q }),
    teamMembers(),
    customerOptionsForFolders(),
    projectOptions(),
    sp.aufgabe && /^[0-9a-f-]{36}$/.test(sp.aufgabe) ? getTask(sp.aufgabe) : Promise.resolve(null),
  ]);
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ansicht: view === "board" ? "board" : undefined, wer: wer === "mich" ? undefined : wer, q, ...patch })) if (v) p.set(k, v);
    return `/admin/aufgaben${p.size ? `?${p}` : ""}`;
  };
  const people = [{ key: "mich", label: "Meine" }, { key: "alle", label: "Alle" }, ...team.filter((m) => m.email !== me).map((m) => ({ key: m.email, label: m.name.split(" ")[0] }))];
  const open = tasks.filter((t) => t.status !== "erledigt").length;

  return (
    <>
      <PageHeader
        title="Aufgaben"
        description={`${open} offen · Aufgaben zuweisen, mit Dateien und Notizen – Kollegen werden per E-Mail und in der App benachrichtigt.`}
        actions={<NewTaskButton team={team} customers={customers} me={me} />}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-ink/[0.05] p-1">
          {people.map((p) => (
            <Link key={p.key} href={href({ wer: p.key === "mich" ? undefined : p.key })} scroll={false} className={cn("h-8 rounded-xl px-3 text-sm leading-8 transition", wer === p.key ? "bg-white font-semibold shadow-sm" : "text-stone-dark hover:text-ink")}>
              {p.label}
            </Link>
          ))}
        </div>
        <div className="flex rounded-2xl bg-ink/[0.05] p-1">
          <Link href={href({ ansicht: undefined })} scroll={false} className={cn("inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm", view === "liste" ? "bg-white font-semibold shadow-sm" : "text-stone-dark")}>
            <List className="size-4" aria-hidden /> Liste
          </Link>
          <Link href={href({ ansicht: "board" })} scroll={false} className={cn("inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm", view === "board" ? "bg-white font-semibold shadow-sm" : "text-stone-dark")}>
            <LayoutGrid className="size-4" aria-hidden /> Tafel
          </Link>
        </div>
        <div className="ml-auto">
          <SearchForm defaultValue={q} placeholder="Aufgaben durchsuchen …" hidden={{ ansicht: view === "board" ? "board" : undefined, wer: wer === "mich" ? undefined : wer }} />
        </div>
      </div>
      {tasks.length || view === "board" ? (
        <TaskBoard tasks={tasks} team={team} view={view} />
      ) : (
        <div className="grid place-items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-ink/[0.06]">
          <ListChecks className="size-10 text-accent" aria-hidden />
          <p className="mt-3 text-lg font-semibold">{wer === "mich" ? "Keine Aufgaben für Sie" : "Keine Aufgaben"}</p>
          <p className="mt-1 text-sm text-stone-dark">Oben „Neue Aufgabe“ – zuweisen, Fälligkeit setzen, Dateien anhängen.</p>
          <div className="mt-5 w-full max-w-md">
            <TaskBoard tasks={[]} team={team} view="liste" />
          </div>
        </div>
      )}
      {detail ? <TaskPanel key={detail.task.id} data={detail} team={team} customers={customers} projects={projects} configured={isR2Configured()} /> : null}
    </>
  );
}
