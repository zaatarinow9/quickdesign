"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, Puzzle, X } from "lucide-react";
import { saveService } from "@/app/admin/service-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { formatEuro, formatQty, grossFromNet, netFromGross, parseDecimal, vatRates } from "@/lib/documents/format";
import { calcTypeInfo, calcTypes, priceLabel, pricePerOptions, type CalcType } from "@/lib/documents/calc";
import type { CatalogService } from "@/lib/documents/queries";
import { Notice } from "@/components/admin/ui";
import { CalcTypeIcon, DND_SERVICE, hasServiceDrag, ServicePalette } from "@/components/admin/pricing";
import { cn } from "@/lib/utils";

export function ServiceForm({
  service,
  categories,
  catalog = [],
  onDone,
}: {
  service?: CatalogService;
  categories: string[];
  catalog?: CatalogService[];
  onDone?: () => void;
}) {
  const [mode, setMode] = useState<"netto" | "brutto">("netto");
  const [vat, setVat] = useState<number>(service?.vat_rate ?? 19);
  const [price, setPrice] = useState(service ? String(service.price_net).replace(".", ",") : "");
  const [calcType, setCalcType] = useState<CalcType>(service?.calc_type ?? "stueck");
  const [pricePer, setPricePer] = useState(String(service?.price_per && service.price_per > 1 ? service.price_per : 1000));
  const [components, setComponents] = useState<string[]>(service?.components ?? []);
  const [dragOver, setDragOver] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await saveService(p, fd);
    if (r.ok && !service) {
      (document.getElementById("svc-new") as HTMLFormElement | null)?.reset();
      setPrice("");
      setComponents([]);
      setCalcType("stueck");
    }
    if (r.ok) onDone?.();
    return r;
  }, {});
  const p = parseDecimal(price) ?? 0;
  const other = mode === "netto" ? grossFromNet(p, vat) : netFromGross(p, vat);
  const id = service?.id ?? "new";
  const per = calcType === "menge" ? Math.max(1, Math.round(parseDecimal(pricePer) ?? 1)) : 1;
  const unitText = calcType === "menge" ? `${formatQty(per)} Stk.` : calcTypeInfo[calcType].unit;

  const byId = new Map(catalog.map((s) => [s.id, s]));
  const addComponent = (cid: string) => {
    if (cid === service?.id) return;
    setComponents((cs) => (cs.includes(cid) ? cs : [...cs, cid]));
  };
  const moveComponent = (i: number, d: -1 | 1) =>
    setComponents((cs) => {
      const j = i + d;
      if (j < 0 || j >= cs.length) return cs;
      const c = [...cs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  return (
    <form action={action} id={service ? undefined : "svc-new"} className="grid gap-4 sm:grid-cols-12">
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <input type="hidden" name="price_mode" value={mode} />
      <input type="hidden" name="calc_type" value={calcType} />
      <input type="hidden" name="components" value={JSON.stringify(components)} />
      {state.error ? (
        <div className="sm:col-span-12">
          <Notice tone="error">{state.error}</Notice>
        </div>
      ) : null}
      <div className="sm:col-span-6">
        <label className="adm-label" htmlFor={`n-${id}`}>
          Bezeichnung *
        </label>
        <input id={`n-${id}`} name="name" required defaultValue={service?.name} className="adm-input" placeholder="z. B. Visitenkarten-Druck, Alu-Dibond-Platte 3 mm …" />
      </div>
      <div className="sm:col-span-4">
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

      {/* Berechnungsart */}
      <fieldset className="sm:col-span-12">
        <legend className="adm-label">Wie wird berechnet?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {calcTypes.map((t) => {
            const info = calcTypeInfo[t];
            const active = calcType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setCalcType(t)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left ring-1 transition",
                  active ? "bg-accent/[0.07] ring-2 ring-accent" : "bg-white ring-ink/10 hover:ring-ink/25",
                )}
              >
                <span className={cn("flex items-center gap-1.5 text-sm font-medium", active && "text-accent")}>
                  <CalcTypeIcon type={t} className="size-4" /> {info.label}
                </span>
                <span className="text-[0.72rem] leading-snug text-stone-dark">{info.hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Preis */}
      <div className="sm:col-span-6">
        <label className="adm-label" htmlFor={`p-${id}`}>
          Preis ({mode}) je {unitText} *
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input id={`p-${id}`} name="price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} className="adm-input pr-24 text-right" placeholder="0,00" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone">€ / {unitText}</span>
          </div>
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
          {calcType === "menge" && per > 1 && p > 0 ? ` · entspricht ${formatEuro((mode === "netto" ? p : other) / per)} netto je Stück` : ""}
        </p>
      </div>
      {calcType === "menge" ? (
        <div className="sm:col-span-6">
          <label className="adm-label" htmlFor={`pp-${id}`}>
            Preis gilt je … Stück
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <input id={`pp-${id}`} name="price_per" inputMode="numeric" value={pricePer} onChange={(e) => setPricePer(e.target.value)} className="adm-input w-28 text-right" />
            {pricePerOptions
              .filter((o) => o > 1)
              .map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setPricePer(String(o))}
                  className={cn("h-8 rounded-full px-3 text-xs ring-1", per === o ? "bg-ink text-white ring-ink" : "ring-ink/10 hover:ring-ink/30")}
                >
                  {formatQty(o)}
                </button>
              ))}
          </div>
          <p className="mt-1 text-xs text-stone-dark">Beispiel: 2.500 Stk. ergeben {formatEuro(((mode === "netto" ? p : other) * 2500) / per)} netto.</p>
        </div>
      ) : (
        <input type="hidden" name="price_per" value="1" />
      )}

      {/* Bausteine */}
      <div className="sm:col-span-12">
        <span className="adm-label flex items-center gap-1.5">
          <Puzzle className="size-3.5" aria-hidden /> Bausteine (optional)
        </span>
        <div
          onDragOver={(e) => {
            if (!hasServiceDrag(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            const sid = e.dataTransfer.getData(DND_SERVICE);
            setDragOver(false);
            if (sid) {
              e.preventDefault();
              addComponent(sid);
            }
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-3 transition-colors",
            dragOver ? "border-accent bg-accent/[0.05]" : "border-ink/10 bg-white",
          )}
        >
          {components.length ? (
            <ol className="space-y-1.5">
              {components.map((cid, i) => {
                const c = byId.get(cid);
                return (
                  <li key={cid} className="flex items-center gap-2 rounded-lg bg-ink/[0.03] px-2.5 py-1.5 text-sm">
                    <span className="w-5 text-xs tabular-nums text-stone">{i + 1}.</span>
                    {c ? <CalcTypeIcon type={c.calc_type} className="size-3.5 text-stone-dark" /> : null}
                    <span className="min-w-0 flex-1 truncate">{c?.name ?? "Gelöschte Leistung"}</span>
                    {c ? <span className="hidden text-xs tabular-nums text-stone-dark sm:inline">{priceLabel(c)}</span> : null}
                    <button type="button" aria-label="Nach oben" disabled={i === 0} onClick={() => moveComponent(i, -1)} className="grid size-6 place-items-center rounded text-stone-dark hover:bg-ink/[0.06] disabled:opacity-30">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Nach unten" disabled={i === components.length - 1} onClick={() => moveComponent(i, 1)} className="grid size-6 place-items-center rounded text-stone-dark hover:bg-ink/[0.06] disabled:opacity-30">
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Entfernen" onClick={() => setComponents((cs) => cs.filter((x) => x !== cid))} className="grid size-6 place-items-center rounded text-stone-dark hover:bg-red-50 hover:text-red-700">
                      <X className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-2 text-center text-sm text-stone-dark">
              Leistungen hierher ziehen oder unten anklicken – sie werden beim Hinzufügen zu einem Angebot automatisch mitberechnet.
              <span className="block text-xs">Beispiel: „Schild“ = Alu-Dibond-Platte + Digitaldruck + Laminat (alles pro m², Maße werden einmal eingegeben).</span>
            </p>
          )}
        </div>
        {catalog.length ? (
          <div className="mt-2">
            <ServicePalette catalog={catalog} onPick={(s) => addComponent(s.id)} exclude={[...(service ? [service.id] : []), ...components]} compact limit={18} />
          </div>
        ) : null}
        {components.length && p === 0 ? (
          <p className="mt-2 text-xs text-stone-dark">Preis 0 € mit Bausteinen = reine Vorlage: Im Angebot erscheinen nur die Bausteine mit ihren Preisen.</p>
        ) : null}
      </div>

      <div className="sm:col-span-12">
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
