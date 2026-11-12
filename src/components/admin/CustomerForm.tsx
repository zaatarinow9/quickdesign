"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveCustomer } from "@/app/admin/customer-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { Notice } from "@/components/admin/ui";

export type CustomerData = {
  id?: string;
  kind?: string;
  status?: string;
  salutation?: string | null;
  name?: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  vat_id?: string | null;
  website?: string | null;
  birthday?: string | null;
  tags?: string[];
  notes?: string | null;
};

function F({ id, label, children, className }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="adm-label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function CustomerForm({ customer }: { customer?: CustomerData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCustomer, {});
  const c = customer ?? {};
  return (
    <form action={action} className="space-y-4">
      {c.id ? <input type="hidden" name="id" value={c.id} /> : null}
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-6">
        <F id="kind" label="Typ" className="sm:col-span-2">
          <select id="kind" name="kind" defaultValue={c.kind ?? "privat"} className="adm-input">
            <option value="privat">Privatkunde</option>
            <option value="firma">Geschäftskunde</option>
          </select>
        </F>
        <F id="status" label="Status" className="sm:col-span-2">
          <select id="status" name="status" defaultValue={c.status ?? "lead"} className="adm-input">
            <option value="lead">Interessent (Lead)</option>
            <option value="kunde">Kunde</option>
            <option value="inaktiv">Inaktiv</option>
          </select>
        </F>
        <F id="salutation" label="Anrede" className="sm:col-span-2">
          <select id="salutation" name="salutation" defaultValue={c.salutation ?? ""} className="adm-input">
            <option value="">–</option>
            <option>Herr</option>
            <option>Frau</option>
            <option>Divers</option>
          </select>
        </F>
        <F id="name" label="Name / Ansprechpartner *" className="sm:col-span-3">
          <input id="name" name="name" required defaultValue={c.name} className="adm-input" />
        </F>
        <F id="company_name" label="Firma" className="sm:col-span-3">
          <input id="company_name" name="company_name" defaultValue={c.company_name ?? ""} className="adm-input" />
        </F>
        <F id="email" label="E-Mail" className="sm:col-span-3">
          <input id="email" name="email" type="email" defaultValue={c.email ?? ""} className="adm-input" />
        </F>
        <F id="phone" label="Telefon" className="sm:col-span-3">
          <input id="phone" name="phone" defaultValue={c.phone ?? ""} className="adm-input" />
        </F>
        <F id="street" label="Straße & Hausnummer" className="sm:col-span-3">
          <input id="street" name="street" defaultValue={c.street ?? ""} className="adm-input" />
        </F>
        <F id="postal_code" label="PLZ" className="sm:col-span-1">
          <input id="postal_code" name="postal_code" defaultValue={c.postal_code ?? ""} className="adm-input" />
        </F>
        <F id="city" label="Ort" className="sm:col-span-2">
          <input id="city" name="city" defaultValue={c.city ?? ""} className="adm-input" />
        </F>
        <F id="country" label="Land" className="sm:col-span-2">
          <input id="country" name="country" defaultValue={c.country ?? "Deutschland"} className="adm-input" />
        </F>
        <F id="vat_id" label="USt-IdNr." className="sm:col-span-2">
          <input id="vat_id" name="vat_id" defaultValue={c.vat_id ?? ""} className="adm-input" />
        </F>
        <F id="website" label="Website" className="sm:col-span-2">
          <input id="website" name="website" defaultValue={c.website ?? ""} className="adm-input" />
        </F>
        <F id="tags" label="Schlagwörter (kommagetrennt, z. B. Gastronomie, Stammkunde)" className="sm:col-span-4">
          <input id="tags" name="tags" defaultValue={(c.tags ?? []).join(", ")} className="adm-input" />
        </F>
        <F id="birthday" label="Geburtstag / Firmenjubiläum" className="sm:col-span-2">
          <input id="birthday" name="birthday" type="date" defaultValue={c.birthday ?? ""} className="adm-input" />
        </F>
        <F id="notes" label="Interne Notizen" className="sm:col-span-6">
          <textarea id="notes" name="notes" rows={4} defaultValue={c.notes ?? ""} className="adm-input" />
        </F>
      </div>
      <div className="flex items-center justify-end gap-3">
        {state.ok ? (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
            <Check className="size-4" aria-hidden /> {state.ok}
          </span>
        ) : null}
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {c.id ? "Speichern" : "Kunde anlegen"}
        </button>
      </div>
    </form>
  );
}
