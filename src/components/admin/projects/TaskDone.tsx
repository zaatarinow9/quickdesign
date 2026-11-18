"use client";

import { useActionState } from "react";
import { CircleCheck, Loader2, RotateCcw } from "lucide-react";
import { setProjectStatus } from "@/app/admin/project-actions";
import type { ActionState } from "@/app/admin/document-actions";

/** Freier Termin: erledigt / wieder öffnen */
export function TaskDone({ id, done }: { id: string; done: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setProjectStatus, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={done ? "fertig" : "abgeschlossen"} />
      {done ? (
        <>
          <span className="inline-flex items-center gap-2 font-medium text-emerald-700">
            <CircleCheck className="size-5" aria-hidden /> Erledigt
          </span>
          <button type="submit" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RotateCcw className="size-3.5" aria-hidden />} Wieder öffnen
          </button>
        </>
      ) : (
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />} Als erledigt markieren
        </button>
      )}
      {state.error ? <span className="text-sm text-red-700">{state.error}</span> : null}
    </form>
  );
}
