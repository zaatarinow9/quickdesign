"use client";

import { useActionState, useState } from "react";
import { Check, ChevronRight, Loader2, Mail } from "lucide-react";
import { setProjectStatus } from "@/app/admin/project-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { projectStatuses, projectStatusInfo, type ProjectStatus } from "@/lib/projects/shared";
import { Notice } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** Fortschritt eines Auftrags: Phasen anklicken, optional Kunden per E-Mail informieren */
export function StageControl({
  id,
  status,
  stamps,
  hasEmail,
  notifyDefault,
}: {
  id: string;
  status: ProjectStatus;
  stamps: Partial<Record<ProjectStatus, string | null>>;
  hasEmail: boolean;
  notifyDefault: boolean;
}) {
  const [target, setTarget] = useState<ProjectStatus | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await setProjectStatus(p, fd);
    if (r.ok) setTarget(null);
    return r;
  }, {});
  const idx = projectStatuses.indexOf(status);
  const next = projectStatuses[idx + 1];

  return (
    <div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {projectStatuses.map((s, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => setTarget(s === status ? null : s)}
                className={cn(
                  "group flex h-full w-full flex-col gap-1 rounded-xl p-3 text-left ring-1 transition",
                  current ? "bg-ink text-white ring-ink" : done ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-ink/10 hover:ring-ink/30",
                  target === s && "ring-2 ring-accent",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs",
                      current ? "bg-accent text-white" : done ? "bg-emerald-500 text-white" : "bg-ink/[0.06] text-stone-dark",
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  {projectStatusInfo[s].label}
                </span>
                <span className={cn("text-xs", current ? "text-white/70" : "text-stone-dark")}>
                  {stamps[s] ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(stamps[s]!)) : projectStatusInfo[s].hint}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {!target && next ? (
        <button type="button" onClick={() => setTarget(next)} className="adm-btn adm-btn-primary mt-4">
          Weiter: {projectStatusInfo[next].label} <ChevronRight className="size-4" aria-hidden />
        </button>
      ) : null}

      {target ? (
        <form action={action} className="mt-4 space-y-3 rounded-xl bg-[#f7f5f1] p-4 ring-1 ring-ink/[0.06]">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={target} />
          <p className="text-sm">
            Status auf <strong>{projectStatusInfo[target].label}</strong> setzen?
          </p>
          {hasEmail ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notify" defaultChecked={notifyDefault} className="size-4 accent-[var(--color-accent)]" />
                <Mail className="size-4 text-stone-dark" aria-hidden /> Kunden per E-Mail informieren
              </label>
              <textarea name="message" rows={2} className="adm-input text-sm" placeholder="Eigene Nachricht (optional – sonst Standardtext)" />
            </>
          ) : (
            <p className="text-xs text-stone-dark">Keine Kunden-E-Mail hinterlegt – es wird keine Nachricht versendet.</p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Status setzen
            </button>
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setTarget(null)}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}
      {state.ok || state.error ? (
        <div className="mt-3">
          <Notice tone={state.error ? "error" : "success"}>{state.error ?? state.ok}</Notice>
        </div>
      ) : null}
    </div>
  );
}
