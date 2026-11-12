"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateSettings } from "@/app/admin/settings-actions";
import type { ActionState } from "@/app/admin/document-actions";
import type { Settings } from "@/lib/settings/schema";
import { Notice } from "@/components/admin/ui";

function Input({ name, label, value, className, type = "text" }: { name: string; label: string; value: string | number; className?: string; type?: string }) {
  return (
    <div className={className}>
      <label className="adm-label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={value} className="adm-input" />
    </div>
  );
}
function Area({ name, label, value, rows = 3 }: { name: string; label: string; value: string; rows?: number }) {
  return (
    <div className="sm:col-span-2">
      <label className="adm-label" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} rows={rows} defaultValue={value} className="adm-input text-sm" />
    </div>
  );
}
function Toggle({ name, label, checked, hint }: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 sm:col-span-2">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 size-4 accent-[var(--color-accent)]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-stone-dark">{hint}</span> : null}
      </span>
    </label>
  );
}
function Section({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <section className="adm-card grid gap-6 p-5 lg:grid-cols-[16rem_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {text ? <p className="mt-1 text-sm text-stone-dark">{text}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSettings, {});
  return (
    <form action={action} className="space-y-6 pb-24">
      <Section title="Firmendaten" text="Erscheinen auf Angeboten, Rechnungen und in E-Mails.">
        <Input name="company.name" label="Firmenname" value={s.company.name} />
        <Input name="company.owner" label="Inhaber" value={s.company.owner} />
        <Input name="company.street" label="Straße & Hausnummer" value={s.company.street} className="sm:col-span-2" />
        <Input name="company.postalCode" label="PLZ" value={s.company.postalCode} />
        <Input name="company.city" label="Ort" value={s.company.city} />
        <Input name="company.phone" label="Telefon" value={s.company.phone} />
        <Input name="company.email" label="E-Mail" value={s.company.email} type="email" />
        <Input name="company.website" label="Website" value={s.company.website} />
        <Input name="company.country" label="Land" value={s.company.country} />
      </Section>
      <Section title="Steuer" text="Pflichtangaben auf Rechnungen (§ 14 UStG): Steuernummer oder USt-IdNr.">
        <Input name="company.taxNumber" label="Steuernummer" value={s.company.taxNumber} />
        <Input name="company.vatId" label="USt-IdNr." value={s.company.vatId} />
        <Input name="company.register" label="Handelsregister (optional)" value={s.company.register} className="sm:col-span-2" />
        <div>
          <label className="adm-label" htmlFor="tax.defaultVatRate">
            Standard-Steuersatz
          </label>
          <select id="tax.defaultVatRate" name="tax.defaultVatRate" defaultValue={s.tax.defaultVatRate} className="adm-input">
            <option value="19">19 %</option>
            <option value="7">7 %</option>
            <option value="0">0 %</option>
          </select>
        </div>
        <Toggle name="tax.smallBusiness" label="Kleinunternehmer nach § 19 UStG" checked={s.tax.smallBusiness} hint="Keine Umsatzsteuer ausweisen; Hinweis erscheint automatisch auf Dokumenten." />
      </Section>
      <Section title="Bankverbindung" text="Wird auf Rechnungen und im Zahlungsbereich angezeigt.">
        <Input name="bank.holder" label="Kontoinhaber" value={s.bank.holder} />
        <Input name="bank.bankName" label="Bank" value={s.bank.bankName} />
        <Input name="bank.iban" label="IBAN" value={s.bank.iban} />
        <Input name="bank.bic" label="BIC" value={s.bank.bic} />
      </Section>
      <Section title="Angebote" text="Standardtexte für neue Angebote.">
        <Input name="offers.validityDays" label="Gültigkeit (Tage)" value={s.offers.validityDays} type="number" />
        <div />
        <Area name="offers.intro" label="Einleitung (nach der Anrede)" value={s.offers.intro} />
        <Area name="offers.notes" label="Hinweise" value={s.offers.notes} />
        <Area name="offers.paymentTerms" label="Zahlungsbedingungen" value={s.offers.paymentTerms} />
        <Area name="offers.closing" label="Schlusstext" value={s.offers.closing} rows={2} />
      </Section>
      <Section title="Rechnungen" text="Standardtexte für neue Rechnungen.">
        <Input name="invoices.dueDays" label="Zahlungsziel (Tage)" value={s.invoices.dueDays} type="number" />
        <div />
        <Area name="invoices.intro" label="Einleitung (nach der Anrede)" value={s.invoices.intro} />
        <Area name="invoices.notes" label="Hinweise" value={s.invoices.notes} />
        <Area name="invoices.paymentTerms" label="Zahlungsbedingungen" value={s.invoices.paymentTerms} />
        <Area name="invoices.closing" label="Schlusstext" value={s.invoices.closing} rows={2} />
      </Section>
      <Section title="Benachrichtigungen">
        <Input name="notifications.inbox" label="Postfach für Benachrichtigungen" value={s.notifications.inbox} type="email" className="sm:col-span-2" />
        <Toggle name="notifications.notifyOnInquiry" label="E-Mail bei neuer Anfrage" checked={s.notifications.notifyOnInquiry} />
        <Toggle name="notifications.notifyOnAcceptance" label="E-Mail, wenn ein Kunde ein Angebot annimmt" checked={s.notifications.notifyOnAcceptance} />
      </Section>
      <Section title="Sicherheit">
        <Toggle name="security.require2fa" label="Zwei-Faktor-Anmeldung für alle Benutzer verpflichtend" checked={s.security.require2fa} hint="Benutzer ohne 2FA werden nach der Anmeldung zur Einrichtung geleitet." />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-white/90 backdrop-blur lg:left-[17rem]">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-10">
          <div className="text-sm">
            {state.error ? <Notice tone="error">{state.error}</Notice> : state.ok ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="size-4" aria-hidden /> {state.ok}</span> : null}
          </div>
          <button className="adm-btn adm-btn-primary" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Einstellungen speichern
          </button>
        </div>
      </div>
    </form>
  );
}
