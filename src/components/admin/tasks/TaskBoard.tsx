"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ListChecks, MessageSquare, Plus } from "lucide-react";
import { createTask, updateTask } from "@/app/admin/task-actions";
import { useFeedback } from "@/components/admin/feedback";
import { taskStatuses, taskStatusInfo, type Task, type TaskStatus, type TeamMember } from "@/lib/tasks/shared";
import { cn } from "@/lib/utils";
import { DueMenu, PeopleMenu, PriorityMenu, StatusMenu } from "./TaskInline";

const DND = "application/x-qd-task";

export { Avatar, StatusIcon } from "./TaskBits";
import { StatusIcon } from "./TaskBits";

/** Aufgabenliste nach Status gruppiert (wie ClickUp) oder als Tafel */
export function TaskBoard({ tasks, team, view, unread = [] }: { tasks: Task[]; team: TeamMember[]; view: "liste" | "board"; unread?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { toast } = useFeedback();
  const [, start] = useTransition();
  const [patches, setPatches] = useState<Record<string, Partial<Task>>>({});
  const [collapsed, setCollapsed] = useState<Set<TaskStatus>>(new Set());
  const [over, setOver] = useState<TaskStatus | null>(null);
  const list = useMemo(() => tasks.map((t) => (patches[t.id] ? { ...t, ...patches[t.id] } : t)), [tasks, patches]);

  const open = (id: string) => {
    // außerhalb der Aufgabenseite (z. B. Kundenakte): dort öffnen
    if (pathname !== "/admin/aufgaben") return router.push(`/admin/aufgaben?wer=alle&aufgabe=${id}`);
    const p = new URLSearchParams(sp.toString());
    p.set("aufgabe", id);
    router.push(`${pathname}?${p}`, { scroll: false });
  };
  /** sofort anzeigen, im Hintergrund speichern */
  const patch = (t: Task) => (p: Partial<Pick<Task, "status" | "priority" | "assignees" | "due_date">>) => {
    setPatches((m) => ({ ...m, [t.id]: { ...m[t.id], ...p } }));
    start(async () => {
      const r = await updateTask({ id: t.id, status: p.status, priority: p.priority, assignees: p.assignees, due: p.due_date === undefined ? undefined : p.due_date });
      if (r.error) {
        toast(r.error, { tone: "error" });
        setPatches((m) => ({ ...m, [t.id]: {} }));
      } else if (p.assignees) toast("Gespeichert – neue Zuständige werden benachrichtigt.");
    });
  };
  const setStatus = (t: Task, status: TaskStatus) => patch(t)({ status });

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
                      <div className="flex items-start gap-1.5">
                        <span onClick={(e) => e.stopPropagation()} className="-ml-1 -mt-0.5">
                          <StatusMenu t={t} onPatch={patch(t)} size="sm" />
                        </span>
                        <p className={cn("font-medium leading-snug", t.status === "erledigt" && "text-stone-dark line-through", unread.includes(t.id) && "font-bold")}>
                          {unread.includes(t.id) ? <span className="mr-1.5 inline-block size-2 rounded-full bg-accent align-middle" /> : null}
                          {t.title}
                        </p>
                      </div>
                      {t.customer ? <p className="mt-0.5 truncate text-xs text-sky-700">{t.customer.company_name || t.customer.name}</p> : null}
                      <Meta t={t} team={team} onPatch={patch(t)} />
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
                <div className="hidden grid-cols-[1.75rem_minmax(0,1fr)_9rem_9rem_7rem_3rem] gap-x-3 border-b border-ink/[0.05] px-4 py-2 text-[0.7rem] font-medium uppercase tracking-wide text-stone lg:grid">
                  <span />
                  <span>Aufgabe</span>
                  <span>Zuständig</span>
                  <span>Fällig</span>
                  <span>Priorität</span>
                  <span />
                </div>
                <ul className="divide-y divide-ink/[0.05]">
                  {group.map((t) => {
                    return (
                      <li key={t.id} className="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 px-4 py-2.5 hover:bg-ink/[0.02] lg:grid-cols-[1.75rem_minmax(0,1fr)_9rem_9rem_7rem_3rem]" onClick={() => open(t.id)}>
                        <StatusMenu t={t} onPatch={patch(t)} />
                        <span className="min-w-0">
                          <span className={cn("flex items-center gap-2 truncate font-medium", t.status === "erledigt" && "text-stone-dark line-through", unread.includes(t.id) && "font-bold")}>
                            {unread.includes(t.id) ? <span className="size-2 shrink-0 rounded-full bg-accent" title="Neu für Sie" /> : null}
                            <span className="truncate">{t.title}</span>
                          </span>
                          <span className="flex flex-wrap items-center gap-x-3 text-xs text-stone-dark">
                            {t.customer ? <span className="truncate text-sky-700">{t.customer.company_name || t.customer.name}</span> : null}
                            {t.checklist_total ? (
                              <span className="inline-flex items-center gap-1">
                                <ListChecks className="size-3.5" aria-hidden /> {t.checklist_done}/{t.checklist_total}
                              </span>
                            ) : null}
                            <span className="lg:hidden" onClick={(e) => e.stopPropagation()}>
                              <DueMenu t={t} onPatch={patch(t)} compact />
                            </span>
                          </span>
                        </span>
                        <span className="hidden lg:flex">
                          <PeopleMenu key={t.assignees.join()} t={t} team={team} onPatch={patch(t)} />
                        </span>
                        <span className="hidden lg:flex">
                          <DueMenu t={t} onPatch={patch(t)} />
                        </span>
                        <span className="hidden lg:flex">
                          <PriorityMenu t={t} onPatch={patch(t)} />
                        </span>
                        <span className="hidden items-center gap-1 text-sm text-stone-dark lg:flex">
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

function Meta({ t, team, onPatch }: { t: Task; team: TeamMember[]; onPatch: Parameters<typeof StatusMenu>[0]["onPatch"] }) {
  return (
    <div className="mt-2.5 flex items-center gap-1 text-xs" onClick={(e) => e.stopPropagation()}>
      <PeopleMenu key={t.assignees.join()} t={t} team={team} onPatch={onPatch} max={3} />
      <DueMenu t={t} onPatch={onPatch} compact />
      <PriorityMenu t={t} onPatch={onPatch} iconOnly />
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
