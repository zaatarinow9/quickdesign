"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, Check, Flag, FolderOpen, History, ListChecks, Loader2, Paperclip, Plus, Send, Trash2, UserRound, Users, X } from "lucide-react";
import { addChecklistItem, addTaskComment, deleteChecklistItem, deleteTask, toggleChecklistItem, updateTask } from "@/app/admin/task-actions";
import { useFeedback } from "@/components/admin/feedback";
import { DatePicker } from "@/components/admin/DatePicker";
import { FileIcon } from "@/components/admin/files/FileIcon";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { personColor, taskPriorities, taskPriorityInfo, taskStatuses, taskStatusInfo, type Task, type TaskPriority, type TaskStatus, type TeamMember } from "@/lib/tasks/shared";
import type { StoredFile } from "@/lib/files/shared";
import { cn } from "@/lib/utils";
import { Avatar, StatusIcon } from "./TaskBits";

type Detail = {
  task: Task;
  checklist: { id: string; text: string; done: boolean }[];
  comments: { id: number; author: string; body: string; created_at: string }[];
  events: { id: number; actor: string | null; type: string; note: string | null; created_at: string }[];
  files: StoredFile[];
  thumbs: Record<string, string>;
};

const when = (iso: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso));
const evText: Record<string, string> = { erstellt: "hat die Aufgabe erstellt", status: "Status", prioritaet: "Priorität", faellig: "Fällig", zugewiesen: "hat zugewiesen", entfernt: "hat entfernt" };

export function TaskPanel({ data, team, customers, projects, configured }: { data: Detail; team: TeamMember[]; customers: { id: string; label: string }[]; projects: { id: string; label: string }[]; configured: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { toast, confirm } = useFeedback();
  const [pending, start] = useTransition();
  const t = data.task;
  const [title, setTitle] = useState(t.title);
  const [desc, setDesc] = useState(t.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(t.status);
  const [due, setDue] = useState<string | null>(t.due_date);
  const [assignees, setAssignees] = useState<string[]>(t.assignees);
  const [pickPeople, setPickPeople] = useState(false);
  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState("");
  const feed = useRef<HTMLDivElement>(null);

  const close = () => {
    const p = new URLSearchParams(sp.toString());
    p.delete("aufgabe");
    router.push(p.size ? `${pathname}?${p}` : pathname, { scroll: false });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector('[role="alertdialog"]')) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA"].includes(el.tagName)) return el.blur();
      close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  });
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight });
  }, [data.comments.length]);

  const save = (patch: Omit<Parameters<typeof updateTask>[0], "id">) =>
    start(async () => {
      const r = await updateTask({ id: t.id, ...patch });
      if (r.error) toast(r.error, { tone: "error" });
    });

  const feedItems = useMemo(
    () =>
      [
        ...data.events.map((e) => ({ kind: "event" as const, at: e.created_at, actor: e.actor, text: `${evText[e.type] ?? e.type}${e.note ? `: ${e.note}` : ""}` })),
        ...data.comments.map((c) => ({ kind: "comment" as const, at: c.created_at, actor: c.author, text: c.body })),
      ].sort((a, b) => (a.at < b.at ? -1 : 1)),
    [data.events, data.comments],
  );
  const done = data.checklist.filter((c) => c.done).length;

  return (
    <div className="qd-fade-in fixed inset-0 z-[55] flex items-stretch justify-center bg-ink/50 p-0 backdrop-blur-[3px] sm:p-3 lg:p-5" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="qd-pop-in flex h-full w-full max-w-[112rem] flex-col overflow-hidden bg-white shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label={t.title}>
        {/* Kopf */}
        <header className="flex items-center gap-2 border-b border-ink/[0.07] px-4 py-3 sm:px-6">
          <span className="text-xs text-stone-dark">Aufgabe</span>
          {t.customer ? (
            <Link href={`/admin/kunden/${t.customer.id}`} className="truncate rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-500/20">
              {t.customer.company_name || t.customer.name}
            </Link>
          ) : null}
          {pending ? <Loader2 className="size-4 animate-spin text-stone" aria-hidden /> : null}
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({ title: `„${t.title}“ löschen?`, danger: true });
              if (!ok.ok) return;
              const r = await deleteTask(t.id);
              if (r.error) return toast(r.error, { tone: "error" });
              toast(r.ok ?? "Gelöscht.", { undo: r.trashIds });
              close();
            }}
            className="ml-auto grid size-9 place-items-center rounded-xl text-stone-dark hover:bg-red-50 hover:text-red-600"
            aria-label="Aufgabe löschen"
          >
            <Trash2 className="size-4" />
          </button>
          <button type="button" onClick={close} className="grid size-9 place-items-center rounded-xl hover:bg-ink/[0.06]" aria-label="Schließen">
            <X className="size-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
          {/* Links: Details */}
          <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-8">
            <textarea
              value={title}
              rows={1}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== t.title && save({ title })}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())}
              className="field-sizing-content w-full resize-none rounded-lg bg-transparent text-2xl font-bold leading-tight outline-none focus:bg-ink/[0.03] sm:text-3xl"
              aria-label="Titel"
            />

            <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <Row icon={<StatusIcon status={status} className="size-4" />} label="Status">
                <div className="flex flex-wrap gap-1.5">
                  {taskStatuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStatus(s);
                        save({ status: s });
                      }}
                      className={cn("h-7 rounded-md px-2.5 text-[0.72rem] font-bold uppercase tracking-wide transition", status === s ? taskStatusInfo[s].head : "bg-ink/[0.04] text-stone-dark hover:bg-ink/[0.08]")}
                    >
                      {taskStatusInfo[s].label}
                    </button>
                  ))}
                </div>
              </Row>
              <Row icon={<Users className="size-4" />} label="Zuständig">
                <div className="relative">
                  <button type="button" onClick={() => setPickPeople((v) => !v)} className="flex min-h-8 flex-wrap items-center gap-1 rounded-lg px-1 hover:bg-ink/[0.04]">
                    {assignees.length ? (
                      assignees.map((a) => (
                        <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] py-0.5 pl-0.5 pr-2 text-xs">
                          <Avatar email={a} team={team} size={22} /> {team.find((m) => m.email === a)?.name ?? a}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-dark">Niemand – zuweisen</span>
                    )}
                  </button>
                  {pickPeople ? (
                    <>
                      <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Schließen" onClick={() => (setPickPeople(false), save({ assignees }))} />
                      <div className="absolute left-0 z-20 mt-1 w-64 rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-ink/10">
                        {team.map((m) => {
                          const on = assignees.includes(m.email);
                          return (
                            <button
                              key={m.email}
                              type="button"
                              onClick={() => setAssignees((a) => (on ? a.filter((x) => x !== m.email) : [...a, m.email]))}
                              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-ink/[0.04]"
                            >
                              <Avatar email={m.email} team={team} />
                              <span className="min-w-0 flex-1 truncate">{m.name}</span>
                              {on ? <Check className="size-4 text-accent" aria-hidden /> : null}
                            </button>
                          );
                        })}
                        <button type="button" onClick={() => (setPickPeople(false), save({ assignees }))} className="adm-btn adm-btn-primary adm-btn-sm mt-1 w-full">
                          Übernehmen & benachrichtigen
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </Row>
              <Row icon={<Calendar className="size-4" />} label="Fällig">
                <DatePicker compact value={due} onChange={(v) => (setDue(v), save({ due: v }))} placeholder="Kein Datum" />
              </Row>
              <Row icon={<Flag className="size-4" />} label="Priorität">
                <div className="flex flex-wrap gap-1">
                  {taskPriorities.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => save({ priority: p })}
                      className={cn("inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold ring-1 transition", t.priority === p ? "text-white" : "bg-white ring-ink/10 hover:ring-ink/25")}
                      style={t.priority === p ? { background: taskPriorityInfo[p as TaskPriority].color, boxShadow: "none" } : { color: taskPriorityInfo[p as TaskPriority].color }}
                    >
                      <Flag className="size-3" fill="currentColor" aria-hidden /> {taskPriorityInfo[p as TaskPriority].label}
                    </button>
                  ))}
                </div>
              </Row>
              <Row icon={<UserRound className="size-4" />} label="Kunde">
                <select defaultValue={t.customer_id ?? ""} onChange={(e) => save({ customerId: e.target.value || null })} className="h-8 max-w-full rounded-lg bg-transparent px-1 outline-none hover:bg-ink/[0.04]" aria-label="Kunde">
                  <option value="">– kein Kunde –</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Row>
              {t.folder ? (
                <Row icon={<FolderOpen className="size-4" />} label="Ordner">
                  <Link href={`/admin/dateien?ordner=${encodeURIComponent(t.folder)}`} className="truncate text-accent hover:underline">
                    {t.folder.split("/").slice(-2).join(" / ")}
                  </Link>
                </Row>
              ) : null}
            </dl>

            <section className="mt-7">
              <h3 className="mb-2 text-sm font-semibold">Beschreibung</h3>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={() => desc !== (t.description ?? "") && save({ description: desc })}
                rows={4}
                placeholder="Was genau ist zu tun? Maße, Farben, Material, Termin beim Kunden …"
                className="w-full rounded-2xl bg-ink/[0.03] p-3.5 text-[0.95rem] leading-relaxed outline-none ring-1 ring-transparent focus:bg-white focus:ring-accent/40"
              />
            </section>

            <section className="mt-6">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <ListChecks className="size-4 text-accent" aria-hidden /> Checkliste
                {data.checklist.length ? <span className="text-xs font-normal text-stone-dark">{done}/{data.checklist.length}</span> : null}
              </h3>
              {data.checklist.length ? (
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / data.checklist.length) * 100}%` }} />
                </div>
              ) : null}
              <ul className="space-y-0.5">
                {data.checklist.map((c) => (
                  <li key={c.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-ink/[0.03]">
                    <input type="checkbox" defaultChecked={c.done} onChange={(e) => start(() => toggleChecklistItem(c.id, e.target.checked))} className="size-4 accent-emerald-600" />
                    <span className={cn("flex-1 text-sm", c.done && "text-stone-dark line-through")}>{c.text}</span>
                    <button type="button" onClick={() => start(() => deleteChecklistItem(c.id))} className="grid size-7 place-items-center rounded-lg text-stone opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" aria-label="Punkt löschen">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newItem.trim()) return;
                  const v = newItem;
                  setNewItem("");
                  start(async () => void (await addChecklistItem(t.id, v)));
                }}
                className="mt-1 flex items-center gap-2 px-2"
              >
                <Plus className="size-4 text-stone" aria-hidden />
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Punkt hinzufügen …" className="h-9 flex-1 bg-transparent text-sm outline-none" />
              </form>
            </section>

            <section className="mt-6">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Paperclip className="size-4 text-accent" aria-hidden /> Dateien {data.files.length ? <span className="text-xs font-normal text-stone-dark">{data.files.length}</span> : null}
              </h3>
              {data.files.length ? (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {data.files.map((f) => (
                    <Link key={f.id} href={`/admin/dateien/${f.id}/ansicht`} className="group overflow-hidden rounded-xl ring-1 ring-ink/[0.07] hover:ring-accent">
                      <div className="grid aspect-[4/3] place-items-center bg-[#f1efea]">
                        {data.thumbs[f.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={data.thumbs[f.id]} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <FileIcon name={f.name} type={f.content_type} className="size-12 rounded-xl [&_svg]:size-6" />
                        )}
                      </div>
                      <p className="truncate px-2 py-1.5 text-xs font-medium">{f.name}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
              {t.folder ? <FileUploader projects={projects} team={team} configured={configured} folder={t.folder} compact /> : null}
            </section>
          </div>

          {/* Rechts: Verlauf + Kommentare */}
          <aside className="flex min-h-[22rem] flex-col border-t border-ink/[0.07] bg-[#faf9f6] lg:min-h-0 lg:border-l lg:border-t-0 xl:w-[28rem]">
            <p className="flex items-center gap-2 border-b border-ink/[0.06] px-5 py-3 text-sm font-semibold">
              <History className="size-4 text-stone-dark" aria-hidden /> Verlauf & Kommentare
            </p>
            <div ref={feed} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {feedItems.map((f, i) =>
                f.kind === "comment" ? (
                  <div key={i} className="flex gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold text-white" style={{ background: personColor(f.actor ?? "") }}>
                      {(f.actor ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <b>{f.actor}</b> <span className="text-stone">{when(f.at)}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-line rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm shadow-sm ring-1 ring-ink/[0.05]">{f.text}</p>
                    </div>
                  </div>
                ) : (
                  <p key={i} className="text-xs text-stone-dark">
                    <b className="font-medium text-ink/80">{f.actor}</b> {f.text} <span className="text-stone">· {when(f.at)}</span>
                  </p>
                ),
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!comment.trim()) return;
                const v = comment;
                setComment("");
                start(async () => {
                  const r = await addTaskComment(t.id, v);
                  if (r.error) toast(r.error, { tone: "error" });
                });
              }}
              className="border-t border-ink/[0.06] p-3"
            >
              <div className="flex items-end gap-2 rounded-2xl bg-white p-2 ring-1 ring-ink/10 focus-within:ring-accent/50">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.currentTarget.form as HTMLFormElement).requestSubmit()}
                  rows={2}
                  placeholder="Kommentar schreiben … (Strg+Enter)"
                  className="min-h-10 flex-1 resize-none bg-transparent px-1.5 text-sm outline-none"
                />
                <button type="submit" disabled={!comment.trim()} className="grid size-9 place-items-center rounded-xl bg-accent text-white disabled:opacity-40" aria-label="Senden">
                  <Send className="size-4" />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[0.68rem] text-stone">Alle Beteiligten werden per E-Mail benachrichtigt.</p>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-2">
      <dt className="flex items-center gap-2 text-stone-dark">
        {icon} {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
