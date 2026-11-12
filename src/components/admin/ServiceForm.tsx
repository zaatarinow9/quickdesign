"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveService } from "@/app/admin/service-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { formatEuro, grossFromNet, netFromGross, parseDecimal, units, vatRates } from "@/lib/documents/format";
import type { CatalogService } from "@/lib/documents/queries";
import { Notice } from "@/components/admin/ui";

export function ServiceForm({ service, categories, onDone }: { service?: CatalogService; categories: string[]; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await saveService(p, fd);
    if (r.ok && !service) (document.getElementById("svc-new") as HTMLFormElement | null)?.reset();
    if (r.ok) onDone?.();
    return r;
  }, {});
  const [mode, setMode] = useState<"netto" | "brutto">("netto");
  const [vat, setVat] = useState<number>(service?.vat_rate ?? 19);
  const [price, setPrice] = useState(service ? String(service.price_net).replace(".", ",") : "");
  const p = parseDecimal(price) ?? 0;
  const other = mode === "netto" ? grossFromNet(p, vat) : netFromGross(p, vat);
  const id = service?.id ?? "new";

  return (
    <form action={action} id={service ? undefined : "svc-new"} className="grid gap-3 sm:grid-cols-12">
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <input type="hidden" name="price_mode" value={mode} />
      {state.error ? (
        <div className="sm:col-span-12">
          <Notice tone="error">{state.error}</Notice>
        </div>
      ) : null}
      <div className="sm:col-span-5">
        <label className="adm-label" htmlFor={`n-${id}`}>
          Bezeichnung *
        </label>
        <input id={`n-${id}`} name="name" required defaultValue={service?.name} className="adm-input" />
      </div>
      <div className="sm:col-span-3">
        <label className="adm-label" htmlFor={`c-${id}`}>
          Kategorie
        </label>
        <input id={`c-${id}`} name="category" list="svc-categories" defaultValue={service?.category ?? ""} className="adm-input" />
        <datalist id="svc-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="sm:col-span-2">
        <label className="adm-label" htmlFor={`u-${id}`}>
          Einheit
        </label>
        <select id={`u-${id}`} name="unit" defaultValue={service?.unit ?? "Stk."} className="adm-input">
          {[...new Set([service?.unit ?? "Stk.", ...units])].map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="adm-label" htmlFor={`v-${id}`}>
          USt.
        </label>
        <select id={`v-${id}`} name="vat_rate" value={vat} onChange={(e) => setVat(Number(e.target.value))} className="adm-input">
          {vatRates.map((v) => (
            <option key={v} value={v}>
              {v} %
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-4">
        <label className="adm-label" htmlFor={`p-${id}`}>
          Preis ({mode}) *
        </label>
        <div className="flex gap-2">
          <input id={`p-${id}`} name="price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} className="adm-input text-right" placeholder="0,00" />
          <div className="flex h-10 shrink-0 rounded-[0.6rem] bg-ink/[0.05] p-0.5 text-xs">
            {(["netto", "brutto"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`rounded-lg px-2.5 capitalize ${mode === m ? "bg-white font-medium shadow-sm" : "text-stone-dark"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-stone-dark">
          = {formatEuro(other)} {mode === "netto" ? "brutto" : "netto"}
        </p>
      </div>
      <div className="sm:col-span-8">
        <label className="adm-label" htmlFor={`d-${id}`}>
          Beschreibung (erscheint unter der Position)
        </label>
        <textarea id={`d-${id}`} name="description" rows={2} defaultValue={service?.description ?? ""} className="adm-input text-sm" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-12">
        <div className="flex gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_favorite" defaultChecked={service?.is_favorite ?? true} className="size-4 accent-[var(--color-accent)]" /> Häufig genutzt (Schnellauswahl)
          </label>
          {service ? (
            <label className="flex items-center gap-2">
              <input type="hidden" name="active_present" value="1" />
              <input type="checkbox" name="active" defaultChecked={service.active} className="size-4" /> Aktiv
            </label>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {state.ok ? (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
              <Check className="size-4" aria-hidden /> {state.ok}
            </span>
          ) : null}
          <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {service ? "Speichern" : "Leistung anlegen"}
          </button>
        </div>
      </div>
    </form>
  );
}
