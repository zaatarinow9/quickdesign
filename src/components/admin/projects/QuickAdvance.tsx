"use client";

import { useActionState } from "react";
import { ChevronRight, Loader2, Mail } from "lucide-react";
import { setProjectStatus } from "@/app/admin/project-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { projectStatusInfo, type ProjectStatus } from "@/lib/projects/shared";

/** Ein Klick: Auftrag in die nächste Phase schieben (Kunde wird je nach Einstellung informiert) */
export function QuickAdvance({ id, next, notify }: { id: string; next: ProjectStatus; notify: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setProjectStatus, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      {notify ? <input type="hidden" name="notify" value="on" /> : null}
      <button type="submit" disabled={pending} className="inline-flex h-7 items-center gap-1 rounded-full bg-ink/[0.05] px-2.5 text-xs font-medium hover:bg-ink hover:text-white" title={notify ? "Kunde wird per E-Mail informiert" : undefined}>
        {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
        {projectStatusInfo[next].label}
        {notify ? <Mail className="size-3" aria-hidden /> : null}
        <ChevronRight className="size-3" aria-hidden />
      </button>
      {state.error ? <span className="text-xs text-red-700">{state.error}</span> : null}
    </form>
  );
}
