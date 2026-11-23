"use client";

import { useState } from "react";
import { Calendar, Check, Flag, UserRound } from "lucide-react";
import { CalendarPanel, Popover } from "@/components/admin/DatePicker";
import { dueInfo, taskPriorities, taskPriorityInfo, taskStatuses, taskStatusInfo, type Task, type TaskPriority, type TaskStatus, type TeamMember } from "@/lib/tasks/shared";
import { cn } from "@/lib/utils";
import { Avatar, StatusIcon } from "./TaskBits";

type Patch = (p: Partial<Pick<Task, "status" | "priority" | "assignees" | "due_date">>) => void;
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** Status direkt in der Liste ändern */
export function StatusMenu({ t, onPatch, size = "md" }: { t: Task; onPatch: Patch; size?: "md" | "sm" }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={setA} type="button" onClick={(e) => (stop(e), setOpen((o) => !o))} className={cn("grid place-items-center rounded-full hover:bg-ink/[0.06]", size === "md" ? "size-7" : "size-6")} aria-label="Status ändern" title={taskStatusInfo[t.status].label}>
        <StatusIcon status={t.status} className={size === "md" ? "size-[1.15rem]" : "size-4"} />
      </button>
      <Popover anchor={a} open={open} onClose={() => setOpen(false)} width={220}>
        {taskStatuses.map((s) => (
          <button key={s} type="button" onClick={() => (onPatch({ status: s }), setOpen(false))} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-ink/[0.04]">
            <StatusIcon status={s as TaskStatus} className="size-4" />
            <span className="flex-1">{taskStatusInfo[s].label}</span>
            {t.status === s ? <Check className="size-4 text-accent" aria-hidden /> : null}
          </button>
        ))}
      </Popover>
    </>
  );
}

/** Zuständige direkt wählen */
export function PeopleMenu({ t, team, onPatch, max = 4 }: { t: Task; team: TeamMember[]; onPatch: Patch; max?: number }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<HTMLButtonElement | null>(null);
  const [sel, setSel] = useState<string[]>(t.assignees);
  const close = () => {
    setOpen(false);
    if (sel.join() !== t.assignees.join()) onPatch({ assignees: sel });
  };
  return (
    <>
      <button
        ref={setA}
        type="button"
        onClick={(e) => {
          stop(e);
          if (open) close();
          else {
            setSel(t.assignees);
            setOpen(true);
          }
        }}
        className="flex h-8 items-center -space-x-1.5 rounded-full px-1 hover:bg-ink/[0.05]"
        aria-label="Zuständige wählen"
      >
        {t.assignees.length ? t.assignees.slice(0, max).map((x) => <Avatar key={x} email={x} team={team} />) : <span className="grid size-6 place-items-center rounded-full border border-dashed border-stone-light text-stone"><UserRound className="size-3.5" aria-hidden /></span>}
      </button>
      <Popover anchor={a} open={open} onClose={close} width={260}>
        <p className="px-2.5 pb-1 pt-1 text-[0.68rem] font-semibold uppercase tracking-wider text-stone">Zuständig</p>
        {team.map((m) => {
          const on = sel.includes(m.email);
          return (
            <button key={m.email} type="button" onClick={() => setSel((s) => (on ? s.filter((x) => x !== m.email) : [...s, m.email]))} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-ink/[0.04]">
              <Avatar email={m.email} team={team} />
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              {on ? <Check className="size-4 text-accent" aria-hidden /> : null}
            </button>
          );
        })}
        <button type="button" onClick={close} className="adm-btn adm-btn-primary adm-btn-sm mt-1 w-full">
          Fertig
        </button>
      </Popover>
    </>
  );
}

/** Fälligkeit direkt setzen */
export function DueMenu({ t, onPatch, compact }: { t: Task; onPatch: Patch; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<HTMLButtonElement | null>(null);
  const due = dueInfo(t.due_date, t.status === "erledigt");
  return (
    <>
      <button
        ref={setA}
        type="button"
        onClick={(e) => (stop(e), setOpen((o) => !o))}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-1.5 text-sm hover:bg-ink/[0.05]",
          compact ? "h-6 text-xs" : "h-8",
          due?.tone === "red" ? "font-semibold text-red-600" : due?.tone === "amber" ? "font-semibold text-amber-600" : "text-stone-dark",
        )}
        aria-label="Fälligkeit"
      >
        <Calendar className="size-3.5" aria-hidden /> {due?.label ?? (compact ? "" : "–")}
      </button>
      <Popover anchor={a} open={open} onClose={() => setOpen(false)}>
        <CalendarPanel value={t.due_date} onPick={(v) => (onPatch({ due_date: v }), setOpen(false))} />
      </Popover>
    </>
  );
}

/** Priorität direkt setzen */
export function PriorityMenu({ t, onPatch, iconOnly }: { t: Task; onPatch: Patch; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<HTMLButtonElement | null>(null);
  const p = taskPriorityInfo[t.priority];
  const filled = t.priority === "dringend" || t.priority === "hoch";
  return (
    <>
      <button ref={setA} type="button" onClick={(e) => (stop(e), setOpen((o) => !o))} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-sm hover:bg-ink/[0.05]" style={{ color: p.color }} aria-label="Priorität">
        <Flag className="size-3.5" fill={filled ? "currentColor" : "none"} aria-hidden /> {iconOnly ? null : p.label}
      </button>
      <Popover anchor={a} open={open} onClose={() => setOpen(false)} width={200}>
        {taskPriorities.map((k) => (
          <button key={k} type="button" onClick={() => (onPatch({ priority: k as TaskPriority }), setOpen(false))} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-ink/[0.04]" style={{ color: taskPriorityInfo[k].color }}>
            <Flag className="size-4" fill="currentColor" aria-hidden />
            <span className="flex-1 font-medium">{taskPriorityInfo[k].label}</span>
            {t.priority === k ? <Check className="size-4" aria-hidden /> : null}
          </button>
        ))}
      </Popover>
    </>
  );
}
