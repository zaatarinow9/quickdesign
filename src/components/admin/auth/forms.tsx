"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signIn, verifyMfa } from "@/app/admin/auth-actions";
import { requestPasswordReset, setInitialPassword } from "@/app/admin/user-actions";
import { Notice } from "@/components/admin/ui";

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" className="adm-btn adm-btn-primary h-11 w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {label}
    </button>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div>
        <label className="adm-label" htmlFor="email">
          E-Mail
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="adm-input h-11" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="adm-label" htmlFor="password">
            Passwort
          </label>
          <Link href="/admin/login/vergessen" className="mb-1.5 text-xs text-stone-dark hover:text-accent">
            Passwort vergessen?
          </Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="adm-input h-11" />
      </div>
      <Submit pending={pending} label="Anmelden" />
    </form>
  );
}

export function MfaForm() {
  const [state, action, pending] = useActionState(verifyMfa, {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div>
        <label className="adm-label" htmlFor="code">
          Code aus der Authenticator-App
        </label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus className="adm-input h-12 text-center text-xl tracking-[0.4em]" />
      </div>
      <Submit pending={pending} label="Bestätigen" />
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  if (state.ok) return <Notice tone="success">{state.ok}</Notice>;
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div>
        <label className="adm-label" htmlFor="email">
          E-Mail
        </label>
        <input id="email" name="email" type="email" required className="adm-input h-11" />
      </div>
      <Submit pending={pending} label="Link anfordern" />
      <Link href="/admin/login" className="block text-center text-sm text-stone-dark hover:text-ink">
        Zurück zur Anmeldung
      </Link>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(setInitialPassword, {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div>
        <label className="adm-label" htmlFor="password">
          Neues Passwort (mind. 12 Zeichen)
        </label>
        <input id="password" name="password" type="password" minLength={12} autoComplete="new-password" required className="adm-input h-11" />
      </div>
      <div>
        <label className="adm-label" htmlFor="confirm">
          Passwort wiederholen
        </label>
        <input id="confirm" name="confirm" type="password" minLength={12} autoComplete="new-password" required className="adm-input h-11" />
      </div>
      <Submit pending={pending} label="Passwort speichern" />
    </form>
  );
}
