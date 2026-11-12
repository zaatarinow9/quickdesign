"use client";

import { useActionState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { inviteUser } from "@/app/admin/user-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { Notice } from "@/components/admin/ui";

export function InviteForm({ canInviteAdmin }: { canInviteAdmin: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(inviteUser, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      {state.error ? <div className="sm:col-span-4"><Notice tone="error">{state.error}</Notice></div> : null}
      {state.ok ? <div className="sm:col-span-4"><Notice tone="success">{state.ok}</Notice></div> : null}
      <div>
        <label className="adm-label" htmlFor="inv-name">Name</label>
        <input id="inv-name" name="full_name" required className="adm-input" />
      </div>
      <div>
        <label className="adm-label" htmlFor="inv-email">E-Mail</label>
        <input id="inv-email" name="email" type="email" required className="adm-input" />
      </div>
      <div>
        <label className="adm-label" htmlFor="inv-role">Rolle</label>
        <select id="inv-role" name="role" className="adm-input" defaultValue="manager">
          <option value="manager">Mitarbeiter (Vertrieb & Kunden)</option>
          {canInviteAdmin ? <option value="admin">Administrator (voller Zugriff)</option> : null}
        </select>
      </div>
      <div className="flex items-end">
        <button className="adm-btn adm-btn-primary w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />} Einladen
        </button>
      </div>
    </form>
  );
}
