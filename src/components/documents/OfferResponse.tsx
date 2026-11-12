"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { respondToOffer, type ActionState } from "@/app/admin/document-actions";

export default function OfferResponse({ token, gross }: { token: string; gross: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(respondToOffer, {});
  const [mode, setMode] = useState<"accept" | "decline">("accept");

  if (state.ok) {
    return (
      <div className="rounded-[1.5rem] bg-ink p-8 text-paper" role="status">
        <span className="grid size-14 place-items-center rounded-full bg-accent">
          <Check className="size-7" aria-hidden />
        </span>
        <p className="mt-6 font-[family-name:var(--font-display)] text-2xl font-medium">Vielen Dank!</p>
        <p className="mt-2 text-paper/70">{state.ok}</p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-[1.5rem] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(11,11,12,0.35)] ring-1 ring-ink/10 sm:p-8">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="decision" value={mode} />
      <div className="flex gap-1 rounded-full bg-paper-2 p-1 text-sm" role="tablist">
        {(["accept", "decline"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full px-4 py-2 transition-colors ${mode === m ? "bg-ink text-paper" : "text-stone-dark hover:text-ink"}`}
          >
            {m === "accept" ? "Angebot annehmen" : "Ablehnen"}
          </button>
        ))}
      </div>

      {state.error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</p> : null}

      {mode === "accept" ? (
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="eyebrow block text-stone-dark">
              Ihr vollständiger Name *
            </label>
            <input id="name" name="name" required minLength={2} maxLength={160} autoComplete="name" className="mt-2 block w-full rounded-xl border border-ink/15 bg-paper/40 px-4 py-3 text-lg focus:border-accent focus:outline-none" />
          </div>
          <label className="flex items-start gap-3 text-sm text-stone-dark">
            <input type="checkbox" name="confirm" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
            <span>
              Ich nehme dieses Angebot über <strong className="text-ink">{gross}</strong> verbindlich an und beauftrage QuickDesign mit der Ausführung zu den genannten Bedingungen.
            </span>
          </label>
          <button type="submit" disabled={pending} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent font-medium text-white transition-colors hover:bg-ink disabled:opacity-60">
            {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />} Verbindlich annehmen
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="reason" className="eyebrow block text-stone-dark">
              Möchten Sie uns einen Grund nennen? (optional)
            </label>
            <textarea id="reason" name="reason" rows={3} maxLength={1000} className="mt-2 block w-full rounded-xl border border-ink/15 bg-paper/40 px-4 py-3 focus:border-accent focus:outline-none" />
          </div>
          <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ink/20 font-medium transition-colors hover:border-ink disabled:opacity-60">
            {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null} Angebot ablehnen
          </button>
        </div>
      )}
    </form>
  );
}
