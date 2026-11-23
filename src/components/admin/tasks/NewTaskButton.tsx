"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Flag, Loader2, Plus, X } from "lucide-react";
import { createTask } from "@/app/admin/task-actions";
import { useFeedback } from "@/components/admin/feedback";
import { DatePicker } from "@/components/admin/DatePicker";
import { taskPriorities, taskPriorityInfo, type TaskPriority, type TeamMember } from "@/lib/tasks/shared";
import { cn } from "@/lib/utils";
import { Avatar } from "./TaskBits";

/** Neue Aufgabe: Titel, Zuständige, Fälligkeit, Priorität, Kunde, Beschreibung */
export function NewTaskButton({ team, customers, me, customerId, label = "Neue Aufgabe" }: { team: TeamMember[]; customers: { id: string; label: string }[]; me: string; customerId?: string; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ title: "", description: "", assignees: [] as string[], due: "", priority: "normal" as TaskPriority, customerId: customerId ?? "" });
  const reset = () => setF({ title: "", description: "", assignees: [], due: "", priority: "normal", customerId: customerId ?? "" });

  const submit = () =>
    start(async () => {
      const r = await createTask({ ...f, due: f.due || null, customerId: f.customerId || null });
      if (r.error) return toast(r.error, { tone: "error" });
      toast(f.assignees.length ? "Aufgabe angelegt – Zuständige werden benachrichtigt." : "Aufgabe angelegt.");
      setOpen(false);
      reset();
      if (pathname === "/admin/aufgaben" && r.id) {
        const p = new URLSearchParams(sp.toString());
        p.set("aufgabe", r.id);
        router.push(`${pathname}?${p}`, { scroll: false });
      }
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="adm-btn adm-btn-primary">
        <Plus className="size-4" aria-hidden /> {label}
      </button>
      {open ? (
        <div className="qd-fade-in fixed inset-0 z-[80] grid place-items-end bg-ink/45 backdrop-blur-[3px] sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="qd-pop-in w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label="Neue Aufgabe">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Neue Aufgabe</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="Schließen">
                <X className="size-4" />
              </button>
            </div>
            <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && f.title.trim() && submit()} placeholder="Was ist zu tun?" className="w-full rounded-xl bg-ink/[0.03] px-3.5 py-3 text-lg font-semibold outline-none ring-1 ring-transparent focus:bg-white focus:ring-accent/40" />
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} placeholder="Details, Maße, Farben, Hinweise …" className="adm-input mt-3" />
            <p className="adm-label mt-3">Zuständig</p>
            <div className="flex flex-wrap gap-1.5">
              {team.map((m) => {
                const on = f.assignees.includes(m.email);
                return (
                  <button
                    key={m.email}
                    type="button"
                    onClick={() => setF({ ...f, assignees: on ? f.assignees.filter((x) => x !== m.email) : [...f.assignees, m.email] })}
                    className={cn("inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm ring-1 transition", on ? "bg-accent/10 font-semibold text-accent ring-accent/40" : "ring-ink/10 hover:ring-ink/25")}
                  >
                    <Avatar email={m.email} team={team} size={22} /> {m.email === me ? "Ich" : m.name.split(" ")[0]}
                    {on ? <Check className="size-3.5" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <span className="adm-label">Fällig</span>
                <DatePicker value={f.due || null} onChange={(v) => setF({ ...f, due: v ?? "" })} placeholder="Kein Datum" />
              </div>
              <div>
                <label className="adm-label" htmlFor="nt-cust">
                  Kunde
                </label>
                <select id="nt-cust" value={f.customerId} onChange={(e) => setF({ ...f, customerId: e.target.value })} className="adm-input">
                  <option value="">– kein Kunde –</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="adm-label mt-3">Priorität</p>
            <div className="flex flex-wrap gap-1.5">
              {taskPriorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setF({ ...f, priority: p })}
                  className={cn("inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold ring-1", f.priority === p ? "text-white ring-transparent" : "bg-white ring-ink/10")}
                  style={f.priority === p ? { background: taskPriorityInfo[p].color } : { color: taskPriorityInfo[p].color }}
                >
                  <Flag className="size-3" fill="currentColor" aria-hidden /> {taskPriorityInfo[p].label}
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="adm-btn adm-btn-ghost">
                Abbrechen
              </button>
              <button type="button" disabled={pending || !f.title.trim()} onClick={submit} className="adm-btn adm-btn-primary">
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Aufgabe anlegen
              </button>
            </div>
            <p className="mt-2 text-right text-[0.7rem] text-stone-dark">Dateien können danach direkt in der Aufgabe angehängt werden.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
