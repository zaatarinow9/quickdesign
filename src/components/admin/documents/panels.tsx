"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Loader2, Mail, Wallet } from "lucide-react";
import { recordPayment, sendDocumentEmail, type ActionState } from "@/app/admin/document-actions";
import { Notice } from "@/components/admin/ui";

export function SendPanel({ id, defaultTo, kind, finalized }: { id: string; defaultTo: string; kind: "angebot" | "rechnung"; finalized: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendDocumentEmail, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.ok ? <Notice tone="success">{state.ok}</Notice> : null}
      <div>
        <label className="adm-label" htmlFor="send-to">
          Empfänger
        </label>
        <input id="send-to" name="to" type="email" required defaultValue={defaultTo} className="adm-input" />
      </div>
      <div>
        <label className="adm-label" htmlFor="send-msg">
          Persönliche Nachricht (optional)
        </label>
        <textarea id="send-msg" name="message" rows={3} className="adm-input text-sm" placeholder="Standardtext wird verwendet, wenn leer." />
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-dark">
        <input type="checkbox" name="copy" defaultChecked className="size-4 accent-[var(--color-accent)]" /> Kopie an unser Postfach
      </label>
      {kind === "rechnung" && !finalized ? <p className="text-xs text-amber-800">Beim Senden wird die Rechnung festgeschrieben und erhält ihre endgültige Nummer.</p> : null}
      <button type="submit" className="adm-btn adm-btn-accent w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
        {kind === "angebot" ? "Angebot senden (PDF + Online-Link)" : "Rechnung senden (PDF)"}
      </button>
    </form>
  );
}

export function PaymentForm({ id, open }: { id: string; open: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordPayment, {});
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.ok ? <Notice tone="success">{state.ok}</Notice> : null}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="adm-label" htmlFor="pay-amount">
            Betrag (€)
          </label>
          <input id="pay-amount" name="amount" inputMode="decimal" defaultValue={open.toFixed(2).replace(".", ",")} className="adm-input text-right" />
        </div>
        <div>
          <label className="adm-label" htmlFor="pay-date">
            Eingang am
          </label>
          <input id="pay-date" name="date" type="date" defaultValue={today} className="adm-input" />
        </div>
      </div>
      <button type="submit" className="adm-btn adm-btn-primary w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wallet className="size-4" aria-hidden />} Zahlung erfassen
      </button>
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={url} className="adm-input min-w-0 flex-1 text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Kunden-Link" />
      <button
        type="button"
        className="adm-btn adm-btn-ghost shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          });
        }}
      >
        {copied ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        <span className="sr-only">Link kopieren</span>
      </button>
    </div>
  );
}

/** Formular-Button mit Sicherheitsabfrage */
export function ConfirmSubmit({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
