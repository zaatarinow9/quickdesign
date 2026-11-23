"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, ChevronDown, Circle, CircleDot, Flag, ListChecks, MessageSquare, Plus, UserRound } from "lucide-react";
import { createTask, updateTask } from "@/app/admin/task-actions";
import { useFeedback } from "@/components/admin/feedback";
import { dueInfo, initials, personColor, taskPriorityInfo, taskStatuses, taskStatusInfo, type Task, type TaskStatus, type TeamMember } from "@/lib/tasks/shared";
import { cn } from "@/lib/utils";

const DND = "application/x-qd-task";

export function Avatar({ email, team, size = 24 }: { email: string; team: TeamMember[]; size?: number }) {
  const name = team.find((m) => m.email === email)?.name ?? email;
  return (
    <span
      title={name}
      className="grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-white"
      style={{ width: size, height: size, background: personColor(email), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  if (status === "erledigt") return <CheckCircle2 className={cn("text-emerald-600", className)} aria-hidden />;
  if (status === "in_arbeit") return <CircleDot className={cn("text-violet-600", className)} aria-hidden />;
  return <Circle className={cn("text-stone", className)} aria-hidden />;
}

/** Aufgabenliste nach Status gruppiert (wie ClickUp) oder als Tafel */
export function TaskBoard({ tasks, team, view }: { tasks: Task[]; team: TeamMember[]; view: "liste" | "board" }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { toast } = useFeedback();
  const [, start] = useTransition();
  const [moved, setMoved] = useState<Record<string, TaskStatus>>({});
  const [collapsed, setCollapsed] = useState<Set<TaskStatus>>(new Set());
  const [over, setOver] = useState<TaskStatus | null>(null);
  const list = useMemo(() => tasks.map((t) => (moved[t.id] ? { ...t, status: moved[t.id] } : t)), [tasks, moved]);

  const open = (id: string) => {
    // außerhalb der Aufgabenseite (z. B. Kundenakte): dort öffnen
    if (pathname !== "/admin/aufgaben") return router.push(`/admin/aufgaben?wer=alle&aufgabe=${id}`);
    const p = new URLSearchParams(sp.toString());
    p.set("aufgabe", id);
    router.push(`${pathname}?${p}`, { scroll: false });
  };
  const setStatus = (t: Task, status: TaskStatus) => {
    setMoved((m) => ({ ...m, [t.id]: status }));
    start(async () => {
      const r = await updateTask({ id: t.id, status });
      if (r.error) toast(r.error, { tone: "error" });
    });
  };
  const toggleDone = (t: Task) => setStatus(t, t.status === "erledigt" ? "offen" : "erledigt");

  if (view === "board")
    return (
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="grid min-w-[760px] grid-cols-3 gap-4">
          {taskStatuses.map((s) => {
            const col = list.filter((t) => t.status === s);
            return (
              <section
                key={s}
                onDragOver={(e) => {
                  if (!Array.from(e.dataTransfer.types).includes(DND)) return;
                  e.preventDefault();
                  setOver(s);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData(DND);
                  setOver(null);
                  const t = list.find((x) => x.id === id);
                  if (t && t.status !== s) setStatus(t, s);
                }}
                className={cn("flex min-h-[60vh] flex-col rounded-3xl bg-ink/[0.03] p-3 transition", over === s && "bg-accent/[0.07] ring-2 ring-accent")}
              >
                <header className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[0.7rem] font-bold uppercase tracking-wide", taskStatusInfo[s].head)}>
                    <StatusIcon status={s} className={cn("size-3.5", s !== "offen" && "text-white")} /> {taskStatusInfo[s].label}
                  </span>
                  <span className="text-xs tabular-nums text-stone-dark">{col.length}</span>
                </header>
                <div className="space-y-2.5">
                  {col.map((t) => (
                    <article
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData(DND, t.id)}
                      onClick={() => open(t.id)}
                      className="cursor-pointer rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-ink/[0.06] transition hover:shadow-md active:cursor-grabbing"
                    >
                      <p className={cn("font-medium leading-snug", t.status === "erledigt" && "text-stone-dark line-through")}>{t.title}</p>
                      {t.customer ? <p className="mt-0.5 truncate text-xs text-sky-700">{t.customer.company_name || t.customer.name}</p> : null}
                      <Meta t={t} team={team} />
                    </article>
                  ))}
                  <QuickAdd status={s} />
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {taskStatuses.map((s) => {
        const group = list.filter((t) => t.status === s);
        const isCollapsed = collapsed.has(s);
        return (
          <section key={s}>
            <button
              type="button"
              onClick={() =>
                setCollapsed((c) => {
                  const n = new Set(c);
                  if (n.has(s)) n.delete(s);
                  else n.add(s);
                  return n;
                })
              }
              className="mb-2 flex items-center gap-2"
            >
              <ChevronDown className={cn("size-4 text-stone-dark transition-transform", isCollapsed && "-rotate-90")} aria-hidden />
              <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[0.7rem] font-bold uppercase tracking-wide", taskStatusInfo[s].head)}>
                <StatusIcon status={s} className={cn("size-3.5", s !== "offen" && "text-white")} /> {taskStatusInfo[s].label}
              </span>
              <span className="text-sm tabular-nums text-stone-dark">{group.length}</span>
            </button>
            {!isCollapsed ? (
              <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.06]">
                <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8.5rem_6.5rem_4rem] gap-3 border-b border-ink/[0.05] px-4 py-2 text-[0.7rem] font-medium uppercase tracking-wide text-stone md:grid">
                  <span>Aufgabe</span>
                  <span>Zuständig</span>
                  <span>Fällig</span>
                  <span>Priorität</span>
                  <span />
                </div>
                <ul className="divide-y divide-ink/[0.05]">
                  {group.map((t) => {
                    const due = dueInfo(t.due_date, t.status === "erledigt");
                    return (
                      <li key={t.id} className="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 px-4 py-2.5 hover:bg-ink/[0.02] md:grid-cols-[auto_minmax(0,1fr)_8rem_8.5rem_6.5rem_4rem]" onClick={() => open(t.id)}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDone(t);
                          }}
                          className="grid size-6 place-items-center rounded-full hover:bg-ink/[0.06]"
                          aria-label={t.status === "erledigt" ? "Wieder öffnen" : "Als erledigt markieren"}
                        >
                          <StatusIcon status={t.status} className="size-[1.15rem]" />
                        </button>
                        <span className="min-w-0">
                          <span className={cn("block truncate font-medium", t.status === "erledigt" && "text-stone-dark line-through")}>{t.title}</span>
                          <span className="flex flex-wrap items-center gap-x-3 text-xs text-stone-dark">
                            {t.customer ? <span className="truncate text-sky-700">{t.customer.company_name || t.customer.name}</span> : null}
                            {t.checklist_total ? (
                              <span className="inline-flex items-center gap-1">
                                <ListChecks className="size-3.5" aria-hidden /> {t.checklist_done}/{t.checklist_total}
                              </span>
                            ) : null}
                            <span className="md:hidden">{due ? due.label : ""}</span>
                          </span>
                        </span>
                        <span className="hidden -space-x-1.5 md:flex">
                          {t.assignees.length ? t.assignees.slice(0, 4).map((a) => <Avatar key={a} email={a} team={team} />) : <UserRound className="size-5 text-stone-light" aria-hidden />}
                        </span>
                        <span className={cn("hidden items-center gap-1.5 text-sm md:flex", due?.tone === "red" ? "font-semibold text-red-600" : due?.tone === "amber" ? "font-semibold text-amber-600" : "text-stone-dark")}>
                          <Calendar className="size-3.5" aria-hidden /> {due?.label ?? "–"}
                        </span>
                        <span className="hidden items-center gap-1.5 text-sm md:flex" style={{ color: taskPriorityInfo[t.priority].color }}>
                          <Flag className="size-3.5" fill={t.priority === "normal" || t.priority === "niedrig" ? "none" : "currentColor"} aria-hidden /> {taskPriorityInfo[t.priority].label}
                        </span>
                        <span className="hidden items-center gap-1 text-sm text-stone-dark md:flex">
                          {t.comment_count ? (
                            <>
                              <MessageSquare className="size-3.5" aria-hidden /> {t.comment_count}
                            </>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-ink/[0.04] px-3 py-1.5">
                  <QuickAdd status={s} inline />
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function Meta({ t, team }: { t: Task; team: TeamMember[] }) {
  const due = dueInfo(t.due_date, t.status === "erledigt");
  return (
    <div className="mt-3 flex items-center gap-2 text-xs">
      <span className="flex -space-x-1.5">{t.assignees.slice(0, 3).map((a) => <Avatar key={a} email={a} team={team} size={22} />)}</span>
      {due ? <span className={cn("rounded-md px-1.5 py-0.5", due.tone === "red" ? "bg-red-50 font-semibold text-red-600" : due.tone === "amber" ? "bg-amber-50 font-semibold text-amber-700" : "bg-ink/[0.04] text-stone-dark")}>{due.label}</span> : null}
      <Flag className="size-3.5" style={{ color: taskPriorityInfo[t.priority].color }} fill={t.priority === "dringend" || t.priority === "hoch" ? "currentColor" : "none"} aria-hidden />
      <span className="ml-auto flex items-center gap-2 text-stone-dark">
        {t.checklist_total ? (
          <span className="inline-flex items-center gap-0.5">
            <ListChecks className="size-3.5" aria-hidden /> {t.checklist_done}/{t.checklist_total}
          </span>
        ) : null}
        {t.comment_count ? (
          <span className="inline-flex items-center gap-0.5">
            <MessageSquare className="size-3.5" aria-hidden /> {t.comment_count}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** Schnell anlegen: Titel tippen, Enter */
function QuickAdd({ status, inline }: { status: TaskStatus; inline?: boolean }) {
  const [v, setV] = useState("");
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const { toast } = useFeedback();
  const sp = useSearchParams();
  const wer = sp.get("wer");
  if (!editing)
    return (
      <button type="button" onClick={() => setEditing(true)} className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-stone-dark hover:bg-ink/[0.04] hover:text-ink", !inline && "justify-center border border-dashed border-ink/15 py-2.5")}>
        <Plus className="size-4" aria-hidden /> Aufgabe hinzufügen
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const title = v.trim();
        if (!title) return setEditing(false);
        setV("");
        start(async () => {
          const r = await createTask({ title, status, assignees: wer && wer !== "alle" && wer.includes("@") ? [wer] : undefined });
          if (r.error) toast(r.error, { tone: "error" });
        });
      }}
      className="flex items-center gap-2 px-1"
    >
      <Plus className="size-4 text-accent" aria-hidden />
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => !v.trim() && setEditing(false)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        placeholder="Titel eingeben und Enter drücken …"
        disabled={pending}
        className="h-9 flex-1 bg-transparent text-sm outline-none"
      />
    </form>
  );
}
