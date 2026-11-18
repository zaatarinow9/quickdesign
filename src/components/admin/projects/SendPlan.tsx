"use client";

import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { sendPlanNow } from "@/app/admin/project-actions";
import type { ActionState } from "@/app/admin/document-actions";

/** Einsatzplan eines Tages sofort senden */
export function SendPlan({ date, label, status }: { date: string; label: string; status: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendPlanNow, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <input type="hidden" name="date" value={date} />
      <button type="submit" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />} {label} jetzt senden
      </button>
      <span className={state.error ? "text-xs text-red-700" : state.ok ? "text-xs text-emerald-700" : "text-xs text-stone-dark"}>{state.error ?? state.ok ?? status}</span>
    </form>
  );
}
