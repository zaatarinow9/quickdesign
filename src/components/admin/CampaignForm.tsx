"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveCampaign } from "@/app/admin/campaign-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { Notice } from "@/components/admin/ui";

export function CampaignForm({ campaign, tags, disabled }: { campaign?: { id: string; name: string; subject: string; body: string; audience_tag: string | null }; tags: string[]; disabled?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCampaign, {});
  return (
    <form action={action} className="space-y-4">
      {campaign ? <input type="hidden" name="id" value={campaign.id} /> : null}
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="adm-label" htmlFor="c-name">
            Interner Name
          </label>
          <input id="c-name" name="name" required defaultValue={campaign?.name} placeholder="z. B. Frühjahrsaktion Fahrzeugbeschriftung" className="adm-input" />
        </div>
        <div>
          <label className="adm-label" htmlFor="c-tag">
            Zielgruppe (optional: nur Kontakte mit Schlagwort)
          </label>
          <select id="c-tag" name="audience_tag" defaultValue={campaign?.audience_tag ?? ""} className="adm-input">
            <option value="">Alle bestätigten Kontakte</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="adm-label" htmlFor="c-subject">
            Betreff
          </label>
          <input id="c-subject" name="subject" required defaultValue={campaign?.subject} className="adm-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="adm-label" htmlFor="c-body">
            Text (die persönliche Anrede und der Abmeldelink werden automatisch ergänzt)
          </label>
          <textarea id="c-body" name="body" required rows={12} defaultValue={campaign?.body} className="adm-input" />
        </div>
      </fieldset>
      {!disabled ? (
        <div className="flex items-center justify-end gap-3">
          {state.ok ? (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
              <Check className="size-4" aria-hidden /> {state.ok}
            </span>
          ) : null}
          <button className="adm-btn adm-btn-primary" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {campaign ? "Speichern" : "Entwurf anlegen"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
