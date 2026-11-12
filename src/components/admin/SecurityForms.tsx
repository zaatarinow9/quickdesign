"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { changePassword, confirmEnroll, startEnroll, type EnrollState } from "@/app/admin/auth-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { Notice } from "@/components/admin/ui";

export function EnrollTotp() {
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [starting, start] = useTransition();
  const [state, action, pending] = useActionState<EnrollState, FormData>(confirmEnroll, {});
  const data = state.factorId ? state : enroll;
  if (state.ok) return <Notice tone="success">{state.ok}</Notice>;
  if (!data?.factorId)
    return (
      <div className="space-y-3">
        {enroll?.error ? <Notice tone="error">{enroll.error}</Notice> : null}
        <button type="button" className="adm-btn adm-btn-primary" disabled={starting} onClick={() => start(async () => setEnroll(await startEnroll()))}>
          {starting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />} Zwei-Faktor-Anmeldung einrichten
        </button>
      </div>
    );
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <input type="hidden" name="factorId" value={data.factorId} />
      <input type="hidden" name="qr" value={data.qr ?? ""} />
      <input type="hidden" name="secret" value={data.secret ?? ""} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.qr} alt="QR-Code für die Authenticator-App" className="size-44 rounded-xl bg-white p-2 ring-1 ring-ink/10" />
      <div className="space-y-3">
        <p className="text-sm text-stone-dark">1. QR-Code mit einer Authenticator-App scannen (z. B. Google Authenticator, Microsoft Authenticator, 1Password).</p>
        <p className="break-all text-xs text-stone-dark">Manuell: <code className="rounded bg-ink/5 px-1">{data.secret}</code></p>
        <p className="text-sm text-stone-dark">2. Den angezeigten 6-stelligen Code eingeben:</p>
        {state.error ? <Notice tone="error">{state.error}</Notice> : null}
        <div className="flex gap-2">
          <input name="code" inputMode="numeric" maxLength={7} required className="adm-input w-40 text-center tracking-[0.3em]" />
          <button className="adm-btn adm-btn-primary" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Aktivieren
          </button>
        </div>
      </div>
    </form>
  );
}

export function PasswordChange() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, {});
  return (
    <form action={action} className="grid max-w-xl gap-3 sm:grid-cols-2">
      {state.error ? <div className="sm:col-span-2"><Notice tone="error">{state.error}</Notice></div> : null}
      {state.ok ? <div className="sm:col-span-2"><Notice tone="success">{state.ok}</Notice></div> : null}
      <div>
        <label className="adm-label" htmlFor="pw1">Neues Passwort (mind. 12 Zeichen)</label>
        <input id="pw1" name="password" type="password" minLength={12} required autoComplete="new-password" className="adm-input" />
      </div>
      <div>
        <label className="adm-label" htmlFor="pw2">Wiederholen</label>
        <input id="pw2" name="confirm" type="password" minLength={12} required autoComplete="new-password" className="adm-input" />
      </div>
      <div>
        <button className="adm-btn adm-btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Passwort ändern
        </button>
      </div>
    </form>
  );
}
