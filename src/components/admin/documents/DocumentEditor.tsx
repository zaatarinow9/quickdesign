"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  GripVertical,
  Plus,
  Puzzle,
  RotateCcw,
  Search,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { saveDocument, type ActionState } from "@/app/admin/document-actions";
import { addServiceFromEditor } from "@/app/admin/service-actions";
import {
  computeTotals,
  formatEuro,
  formatNumber,
  formatQty,
  grossFromNet,
  greetingLine,
  kindLabels,
  lineNet,
  netFromGross,
  parseDecimal,
  units,
  vatRates,
  withGreeting,
  type DocItem,
  type DocumentKind,
  type VatRate,
} from "@/lib/documents/format";
import type { CatalogService, CustomerOption, DocDraft } from "@/lib/documents/queries";
import {
  calcArea,
  calcNeedsFormat,
  calcSummary,
  calcToLine,
  calcTypeFromUnit,
  calcTypeInfo,
  canAuto,
  parseQtyInput,
  partQty,
  partTotal,
  priceLabel,
  pricePerOptions,
  usesFormat,
  type CalcPart,
  type ItemCalc,
} from "@/lib/documents/calc";
import { CalcTypeIcon, DND_ROW, DND_SERVICE, hasServiceDrag, ServiceChip, ServicePalette } from "@/components/admin/pricing";
import { Notice } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  service_id: string | null;
  description: string;
  details: string;
  quantity: string;
  unit: string;
  price: string;
  price_mode: "netto" | "brutto";
  /** Einzelpreis gilt je … Einheiten (z. B. 1000) */
  price_per: number;
  vat_rate: VatRate;
  showDetails: boolean;
  saved?: boolean;
  /** Rechner mit Format und Bausteinen (statt Menge × Preis) */
  calc?: ItemCalc;
};

let seq = 0;
const newKey = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
const fmtInput = (n: number, digits = 2) => formatNumber(n, digits).replace(/\./g, "");

function toRow(it: DocItem): Row {
  const mode = it.price_mode ?? "netto";
  const price = mode === "brutto" ? grossFromNet(it.unit_price, it.vat_rate) : it.unit_price;
  const decimals = Math.round(price * 100) === price * 100 ? 2 : 4;
  const calc = it.calc && Array.isArray(it.calc.parts) && it.calc.parts.length ? it.calc : undefined;
  const details = calc ? (calc.user_details ?? "") : (it.details ?? "");
  return {
    key: newKey(),
    service_id: it.service_id ?? null,
    description: it.description,
    details,
    quantity: fmtInput(it.quantity, Number.isInteger(it.quantity) ? 0 : 2),
    unit: it.unit,
    price: fmtInput(price, decimals),
    price_mode: calc ? "netto" : mode,
    price_per: it.price_per && it.price_per > 1 ? it.price_per : 1,
    vat_rate: it.vat_rate,
    showDetails: !!details,
    calc,
  };
}

function rowNet(r: Row): number {
  const price = parseDecimal(r.price) ?? 0;
  return r.price_mode === "brutto" ? netFromGross(price, r.vat_rate) : price;
}

function toItem(r: Row): DocItem {
  const userDetails = r.details.trim();
  if (r.calc) {
    const line = calcToLine(r.calc);
    const summary = calcSummary(r.calc);
    return {
      service_id: r.service_id,
      description: r.description.trim(),
      details: [userDetails, summary].filter(Boolean).join("\n") || undefined,
      quantity: line.quantity,
      unit: line.unit,
      unit_price: line.unit_price,
      price_per: line.price_per,
      vat_rate: r.vat_rate,
      price_mode: "netto",
      calc: { ...r.calc, user_details: userDetails || undefined },
    };
  }
  return {
    service_id: r.service_id,
    description: r.description.trim(),
    details: userDetails || undefined,
    quantity: parseQtyInput(r.quantity) ?? 0,
    unit: r.unit,
    unit_price: rowNet(r),
    price_per: r.price_per > 1 ? r.price_per : 1,
    vat_rate: r.vat_rate,
    price_mode: r.price_mode,
  };
}

/** Katalogleistung → Baustein für den Rechner */
function serviceToPart(s: CatalogService): CalcPart {
  return {
    service_id: s.id,
    name: s.name,
    calc_type: s.calc_type,
    price_net: s.price_net,
    price_per: s.calc_type === "menge" && s.price_per > 1 ? s.price_per : 1,
    qty: 1,
    auto: s.calc_type !== "stunde",
  };
}

/** Alle Bausteine einer Katalogleistung (Vorlagen mit 0 € bestehen nur aus ihren Bausteinen) */
function partsFor(s: CatalogService, catalog: CatalogService[]): CalcPart[] {
  const comps = s.components.map((id) => catalog.find((c) => c.id === id)).filter((c): c is CatalogService => !!c);
  const base = comps.length && s.price_net === 0 ? [] : [s];
  return [...base, ...comps].map(serviceToPart);
}

/** Einfache Position in einen Rechner mit Bausteinen umwandeln */
function rowToCalc(r: Row): ItemCalc {
  if (r.calc) return r.calc;
  const type = calcTypeFromUnit(r.unit);
  const qty = parseQtyInput(r.quantity) ?? 1;
  const countable = type === "stueck" || type === "menge";
  const hasContent = !!(r.description.trim() || parseDecimal(r.price));
  return {
    count: countable ? qty : 1,
    width_cm: null,
    height_cm: null,
    parts: hasContent
      ? [{ service_id: r.service_id, name: r.description.trim() || "Position", calc_type: type, price_net: rowNet(r), price_per: r.price_per > 1 ? r.price_per : 1, qty, auto: countable || type === "pauschal" }]
      : [],
  };
}

export function DocumentEditor({
  kind,
  id,
  initial,
  catalog,
  customers,
  smallBusiness,
  defaultVat,
  locked,
}: {
  kind: DocumentKind;
  id?: string;
  initial: DocDraft;
  catalog: CatalogService[];
  customers: CustomerOption[];
  smallBusiness: boolean;
  defaultVat: VatRate;
  locked?: string | null;
}) {
  const label = kindLabels[kind];
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveDocument, {});
  const [rows, setRows] = useState<Row[]>(() => initial.items.map(toRow));
  const [f, setF] = useState({
    customer_id: initial.customer_id ?? "",
    customer_salutation: initial.customer_salutation ?? "",
    customer_name: initial.customer_name,
    company_name: initial.company_name ?? "",
    street: initial.street ?? "",
    postal_code: initial.postal_code ?? "",
    city: initial.city ?? "",
    country: initial.country ?? "Deutschland",
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    customer_vat_id: initial.customer_vat_id ?? "",
    title: initial.title,
    reference: initial.reference ?? "",
    doc_date: initial.doc_date,
    valid_until: initial.valid_until ?? "",
    due_date: initial.due_date ?? "",
    service_period: initial.service_period ?? "",
    intro: initial.intro ?? "",
    discount_percent: initial.discount_percent ? fmtInput(initial.discount_percent) : "",
    notes: initial.notes ?? "",
    payment_terms: initial.payment_terms ?? "",
    closing: initial.closing ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  // Anrede im Einleitungstext automatisch anpassen
  const updateGreeting = (salutation: string, name: string) =>
    setF((s) => ({ ...s, intro: withGreeting(s.intro, greetingLine(salutation, name), "") }));

  const items = useMemo(() => rows.map(toItem), [rows]);
  const totals = useMemo(() => computeTotals(items, parseDecimal(f.discount_percent) ?? 0, smallBusiness), [items, f.discount_percent, smallBusiness]);

  const updateRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const newRowFor = (s: CatalogService): Row => {
    const parts = partsFor(s, catalog);
    const vat = smallBusiness ? 0 : s.vat_rate;
    const base = { key: newKey(), service_id: s.id, description: s.name, details: s.description ?? "", price_mode: "netto" as const, vat_rate: vat, showDetails: !!s.description, saved: true };
    if (parts.length > 1 || parts.some((p) => usesFormat(p.calc_type))) {
      return { ...base, quantity: "1", unit: "Stk.", price: "", price_per: 1, calc: { count: 1, width_cm: null, height_cm: null, parts } };
    }
    const per = s.calc_type === "menge" && s.price_per > 1 ? s.price_per : 1;
    return { ...base, quantity: fmtInput(per, 0), unit: calcTypeInfo[s.calc_type].unit, price: fmtInput(s.price_net), price_per: per };
  };

  const addService = (s: CatalogService, at?: number) =>
    setRows((rs) => {
      const row = newRowFor(s);
      if (at === undefined) return [...rs, row];
      return [...rs.slice(0, at), row, ...rs.slice(at)];
    });

  /** Leistung auf eine bestehende Position ziehen → wird als Baustein ergänzt */
  const addPartToRow = (key: string, s: CatalogService) =>
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const calc = rowToCalc(r);
        const parts = [...calc.parts, ...partsFor(s, catalog)];
        return {
          ...r,
          description: r.description.trim() || s.name,
          service_id: r.service_id ?? s.id,
          calc: { ...calc, parts },
        };
      }),
    );

  const moveRowTo = (fromKey: string, toKey: string) =>
    setRows((rs) => {
      const from = rs.findIndex((r) => r.key === fromKey);
      const to = rs.findIndex((r) => r.key === toKey);
      if (from < 0 || to < 0 || from === to) return rs;
      const copy = [...rs];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });

  const addFree = (name = "") =>
    setRows((rs) => [
      ...rs,
      { key: newKey(), service_id: null, description: name, details: "", quantity: "1", unit: "Stk.", price: "", price_mode: "netto", price_per: 1, vat_rate: smallBusiness ? 0 : defaultVat, showDetails: false },
    ]);

  const [listDrag, setListDrag] = useState(false);
  const serviceById = (id: string) => catalog.find((c) => c.id === id);

  const pickCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    setF((s) => ({ ...s, customer_id: id }));
    if (!c) return;
    // Vollständige Daten nachladen
    fetch(`/admin/kunden/${id}/json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((full) => {
        if (!full) return;
        setF((s) => ({
          ...s,
          customer_id: id,
          customer_salutation: full.salutation ?? "",
          customer_name: full.name ?? "",
          company_name: full.company_name ?? "",
          street: full.street ?? "",
          postal_code: full.postal_code ?? "",
          city: full.city ?? "",
          country: full.country ?? "Deutschland",
          email: full.email ?? "",
          phone: full.phone ?? "",
          customer_vat_id: full.vat_id ?? "",
          intro: withGreeting(s.intro, greetingLine(full.salutation, full.name), ""),
        }));
      })
      .catch(() => {});
  };

  const disabled = !!locked;

  return (
    <form action={formAction} className="pb-28">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="inquiry_id" value={initial.inquiry_id ?? ""} />
      <input type="hidden" name="source_document_id" value={initial.source_document_id ?? ""} />
      <input type="hidden" name="customer_id" value={f.customer_id} />

      {locked ? (
        <div className="mb-5">
          <Notice tone="warn">{locked}</Notice>
        </div>
      ) : null}

      <fieldset disabled={disabled} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          {/* Kunde */}
          <section className="adm-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <UserRound className="size-4 text-accent" aria-hidden /> Kunde
              </h2>
              <CustomerPicker customers={customers} value={f.customer_id} onPick={pickCustomer} onClear={() => setF((s) => ({ ...s, customer_id: "" }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-1">
                <label className="adm-label" htmlFor="customer_salutation">
                  Anrede
                </label>
                <select
                  id="customer_salutation"
                  name="customer_salutation"
                  className="adm-input"
                  value={f.customer_salutation}
                  onChange={(e) => {
                    set("customer_salutation")(e);
                    updateGreeting(e.target.value, f.customer_name);
                  }}
                >
                  <option value="">–</option>
                  <option>Herr</option>
                  <option>Frau</option>
                  <option>Divers</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="adm-label" htmlFor="customer_name">
                  Name / Ansprechpartner *
                </label>
                <input
                  id="customer_name"
                  name="customer_name"
                  className="adm-input"
                  required
                  value={f.customer_name}
                  onChange={set("customer_name")}
                  onBlur={() => updateGreeting(f.customer_salutation, f.customer_name)}
                />
              </div>
              <div className="sm:col-span-3">
                <label className="adm-label" htmlFor="company_name">
                  Firma
                </label>
                <input id="company_name" name="company_name" className="adm-input" value={f.company_name} onChange={set("company_name")} />
              </div>
              <div className="sm:col-span-3">
                <label className="adm-label" htmlFor="street">
                  Straße & Hausnummer
                </label>
                <input id="street" name="street" className="adm-input" value={f.street} onChange={set("street")} />
              </div>
              <div className="sm:col-span-1">
                <label className="adm-label" htmlFor="postal_code">
                  PLZ
                </label>
                <input id="postal_code" name="postal_code" className="adm-input" value={f.postal_code} onChange={set("postal_code")} />
              </div>
              <div className="sm:col-span-2">
                <label className="adm-label" htmlFor="city">
                  Ort
                </label>
                <input id="city" name="city" className="adm-input" value={f.city} onChange={set("city")} />
              </div>
              <div className="sm:col-span-2">
                <label className="adm-label" htmlFor="email">
                  E-Mail
                </label>
                <input id="email" name="email" type="email" className="adm-input" value={f.email} onChange={set("email")} />
              </div>
              <div className="sm:col-span-2">
                <label className="adm-label" htmlFor="phone">
                  Telefon
                </label>
                <input id="phone" name="phone" className="adm-input" value={f.phone} onChange={set("phone")} />
              </div>
              <div className="sm:col-span-1">
                <label className="adm-label" htmlFor="country">
                  Land
                </label>
                <input id="country" name="country" className="adm-input" value={f.country} onChange={set("country")} />
              </div>
              <div className="sm:col-span-1">
                <label className="adm-label" htmlFor="customer_vat_id">
                  USt-IdNr.
                </label>
                <input id="customer_vat_id" name="customer_vat_id" className="adm-input" value={f.customer_vat_id} onChange={set("customer_vat_id")} />
              </div>
            </div>
            {!f.customer_id ? <p className="mt-3 text-xs text-stone-dark">Neue Kunden werden beim Speichern automatisch in der Kundendatenbank angelegt (Abgleich über die E-Mail-Adresse).</p> : null}
          </section>

          {/* Kopf */}
          <section className="adm-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="adm-label" htmlFor="title">
                  Titel / Betreff
                </label>
                <input id="title" name="title" className="adm-input text-base font-medium" value={f.title} onChange={set("title")} />
              </div>
              <div className="sm:col-span-2">
                <label className="adm-label" htmlFor="reference">
                  Bezug (optional)
                </label>
                <input id="reference" name="reference" className="adm-input" placeholder="z. B. Ihre Anfrage vom … / Projekt …" value={f.reference} onChange={set("reference")} />
              </div>
              <div className="sm:col-span-2">
                <label className="adm-label" htmlFor="intro">
                  Einleitung
                </label>
                <textarea id="intro" name="intro" rows={4} className="adm-input" value={f.intro} onChange={set("intro")} />
              </div>
            </div>
          </section>

          {/* Positionen */}
          <section className="adm-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.06] px-5 py-3.5">
              <h2 className="font-semibold">Positionen</h2>
              <span className="text-xs text-stone-dark">Preise wahlweise netto oder brutto eingeben – gespeichert wird netto.</span>
            </div>
            <CatalogBar catalog={catalog} onPick={(sv) => addService(sv)} onFree={addFree} />

            <div
              onDragOver={(e) => {
                if (!hasServiceDrag(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setListDrag(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setListDrag(false);
              }}
              onDrop={(e) => {
                setListDrag(false);
                const sv = serviceById(e.dataTransfer.getData(DND_SERVICE));
                if (sv) {
                  e.preventDefault();
                  addService(sv);
                }
              }}
            >
              {rows.length === 0 ? (
                <p className={cn("mx-5 mb-4 rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm text-stone-dark transition-colors", listDrag ? "border-accent bg-accent/[0.05]" : "border-ink/10")}>
                  Noch keine Positionen. Leistung hierher ziehen, oben auswählen oder eine freie Position hinzufügen.
                </p>
              ) : (
                <ol className="divide-y divide-ink/[0.06]">
                  {rows.map((r, i) => (
                    <ItemRow
                      key={r.key}
                      index={i}
                      row={r}
                      count={rows.length}
                      catalog={catalog}
                      smallBusiness={smallBusiness}
                      onChange={(patch) => updateRow(r.key, patch)}
                      onMove={(d) => move(i, d)}
                      onMoveTo={(fromKey) => moveRowTo(fromKey, r.key)}
                      onAddPart={(sv) => addPartToRow(r.key, sv)}
                      onDuplicate={() => setRows((rs) => [...rs.slice(0, i + 1), { ...r, key: newKey() }, ...rs.slice(i + 1)])}
                      onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    />
                  ))}
                </ol>
              )}
              {rows.length && listDrag ? (
                <p className="mx-5 mb-3 rounded-xl border-2 border-dashed border-accent bg-accent/[0.05] px-4 py-3 text-center text-sm text-accent">Hier loslassen = neue Position · auf eine Position ziehen = als Baustein ergänzen</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-ink/[0.06] px-5 py-3.5">
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => addFree()}>
                <Plus className="size-4" aria-hidden /> Freie Position
              </button>
            </div>
          </section>

          {/* Texte */}
          <section className="adm-card p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="adm-label" htmlFor="notes">
                  Hinweise
                </label>
                <textarea id="notes" name="notes" rows={4} className="adm-input" value={f.notes} onChange={set("notes")} />
              </div>
              <div>
                <label className="adm-label" htmlFor="payment_terms">
                  Zahlungsbedingungen
                </label>
                <textarea id="payment_terms" name="payment_terms" rows={4} className="adm-input" value={f.payment_terms} onChange={set("payment_terms")} />
              </div>
              <div className="md:col-span-2">
                <label className="adm-label" htmlFor="closing">
                  Schlusstext
                </label>
                <textarea id="closing" name="closing" rows={2} className="adm-input" value={f.closing} onChange={set("closing")} />
              </div>
            </div>
          </section>
        </div>

        {/* Seitenleiste */}
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="adm-card space-y-3 p-5">
            <div>
              <label className="adm-label" htmlFor="doc_date">
                {kind === "angebot" ? "Angebotsdatum" : "Rechnungsdatum"}
              </label>
              <input id="doc_date" name="doc_date" type="date" required className="adm-input" value={f.doc_date} onChange={set("doc_date")} />
            </div>
            {kind === "angebot" ? (
              <div>
                <label className="adm-label" htmlFor="valid_until">
                  Gültig bis
                </label>
                <input id="valid_until" name="valid_until" type="date" className="adm-input" value={f.valid_until} onChange={set("valid_until")} />
              </div>
            ) : (
              <>
                <div>
                  <label className="adm-label" htmlFor="service_period">
                    Leistungsdatum / -zeitraum *
                  </label>
                  <input id="service_period" name="service_period" className="adm-input" required placeholder="z. B. 12.11.2026 oder November 2026" value={f.service_period} onChange={set("service_period")} />
                </div>
                <div>
                  <label className="adm-label" htmlFor="due_date">
                    Fällig am
                  </label>
                  <input id="due_date" name="due_date" type="date" className="adm-input" value={f.due_date} onChange={set("due_date")} />
                </div>
              </>
            )}
            <div>
              <label className="adm-label" htmlFor="discount_percent">
                Rabatt in %
              </label>
              <input id="discount_percent" name="discount_percent" inputMode="decimal" placeholder="0" className="adm-input" value={f.discount_percent} onChange={set("discount_percent")} />
            </div>
          </section>

          <section className="adm-card overflow-hidden">
            <div className="space-y-1.5 p-5 text-sm">
              {totals.discount > 0 ? (
                <>
                  <Line label="Zwischensumme" value={formatEuro(totals.subtotal)} />
                  <Line label={`Rabatt ${f.discount_percent} %`} value={`− ${formatEuro(totals.discount)}`} />
                </>
              ) : null}
              <Line label="Netto" value={formatEuro(totals.net)} />
              {smallBusiness ? (
                <p className="text-xs text-stone-dark">Kleinunternehmer (§ 19 UStG) – keine USt.</p>
              ) : (
                totals.groups.map((g) => <Line key={g.rate} label={`USt. ${g.rate} %${totals.groups.length > 1 ? ` auf ${formatEuro(g.net)}` : ""}`} value={formatEuro(g.vat)} />)
              )}
            </div>
            <div className="flex items-center justify-between bg-ink px-5 py-4 text-paper">
              <span className="text-sm text-paper/70">Gesamt brutto</span>
              <span className="font-[family-name:var(--font-display)] text-2xl font-medium tabular-nums">{formatEuro(totals.gross)}</span>
            </div>
          </section>
        </aside>
      </fieldset>

      {/* Speichern-Leiste */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-white/90 backdrop-blur lg:left-[17rem] print:hidden">
        <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-10">
          <div className="min-w-0 text-sm" aria-live="polite">
            {state.error ? <span className="text-red-700">{state.error}</span> : state.ok ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><Check className="size-4" aria-hidden /> {state.ok}</span> : (
              <span className="text-stone-dark">
                {rows.length} Position{rows.length === 1 ? "" : "en"} · <strong className="text-ink">{formatEuro(totals.gross)}</strong>
              </span>
            )}
          </div>
          <button type="submit" className="adm-btn adm-btn-primary min-w-40" disabled={pending || disabled}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            {id ? "Speichern" : `${label.one} anlegen`}
          </button>
        </div>
      </div>
    </form>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-stone-dark">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function CustomerPicker({ customers, value, onPick, onClear }: { customers: CustomerOption[]; value: string; onPick: (id: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = customers.find((c) => c.id === value);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? customers.filter((c) => [c.name, c.company_name, c.email, c.customer_number, c.city].some((v) => v?.toLowerCase().includes(t))) : customers).slice(0, 30);
  }, [customers, q]);
  return (
    <div className="relative">
      {current ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 py-1 pl-3 pr-1 text-sm text-emerald-800">
          Verknüpft: {current.customer_number}
          <button type="button" onClick={onClear} className="rounded-full px-2 py-0.5 text-xs hover:bg-emerald-500/20">
            lösen
          </button>
        </span>
      ) : (
        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Search className="size-4" aria-hidden /> Bestehenden Kunden wählen <ChevronDown className="size-3.5" aria-hidden />
        </button>
      )}
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(90vw,24rem)] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-ink/10">
          <div className="border-b border-ink/[0.06] p-2">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Firma, E-Mail, Kundennr. …" className="adm-input" />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {list.length ? (
              list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-ink/[0.04]"
                    onClick={() => {
                      onPick(c.id);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.company_name || c.name}</span>
                      <span className="block truncate text-xs text-stone-dark">
                        {c.customer_number} · {[c.company_name ? c.name : null, c.email, c.city].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-sm text-stone-dark">Kein Kunde gefunden.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CatalogBar({ catalog, onPick, onFree }: { catalog: CatalogService[]; onPick: (s: CatalogService) => void; onFree: (name: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const favorites = catalog.filter((s) => s.is_favorite).slice(0, 10);
  const [showAll, setShowAll] = useState(false);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? catalog.filter((s) => `${s.name} ${s.category ?? ""} ${s.description ?? ""}`.toLowerCase().includes(t)) : catalog).slice(0, 40);
  }, [catalog, q]);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone" aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) onPick(results[0]);
              else if (q.trim()) onFree(q.trim());
              setQ("");
            }
          }}
          placeholder="Leistung suchen oder neuen Namen eingeben …"
          className="adm-input h-11 pl-9"
          aria-label="Leistung aus dem Katalog hinzufügen"
        />
        {open ? (
          <div className="absolute inset-x-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-ink/10">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData(DND_SERVICE, s.id)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(s);
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink/[0.04]"
              >
                {s.is_favorite ? <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden /> : <CalcTypeIcon type={s.calc_type} className="size-3.5 shrink-0 text-stone" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{s.name}</span>
                  {s.category ? <span className="block text-xs text-stone-dark">{s.category}</span> : null}
                </span>
                <span className="shrink-0 text-right text-xs tabular-nums">
                  <span className="block font-medium">{priceLabel(s)} netto</span>
                  <span className="block text-stone-dark">
                    {s.components.length ? `${s.components.length} Bausteine · ` : ""}
                    {calcTypeInfo[s.calc_type].label}
                  </span>
                </span>
              </button>
            ))}
            {q.trim() ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onFree(q.trim());
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 border-t border-ink/[0.06] px-3 py-2.5 text-left text-sm text-accent hover:bg-accent/5"
              >
                <Plus className="size-4" aria-hidden /> „{q.trim()}“ als neue Position hinzufügen
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {favorites.length ? <span className="mr-1 self-center text-xs text-stone-dark">Häufig:</span> : null}
        {favorites.map((s) => (
          <ServiceChip key={s.id} service={s} compact onClick={() => onPick(s)} />
        ))}
        <button type="button" onClick={() => setShowAll((v) => !v)} className="ml-1 inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.78rem] text-accent hover:bg-accent/5" aria-expanded={showAll}>
          <Puzzle className="size-3.5" aria-hidden /> {showAll ? "Weniger" : "Alle Bausteine"}
        </button>
      </div>
      {showAll ? (
        <div className="rounded-xl bg-ink/[0.025] p-3">
          <ServicePalette catalog={catalog} onPick={onPick} compact limit={60} placeholder="Leistung oder Material suchen …" />
        </div>
      ) : null}
      <p className="text-xs text-stone-dark">
        Tipp: Leistungen per Drag &amp; Drop in die Liste ziehen – oder direkt auf eine Position, um sie zu kombinieren (z. B. Folie + Laminat auf eine Dibond-Platte).
      </p>
    </div>
  );
}

function ItemRow({
  index,
  row,
  count,
  catalog,
  smallBusiness,
  onChange,
  onMove,
  onMoveTo,
  onAddPart,
  onDuplicate,
  onRemove,
}: {
  index: number;
  row: Row;
  count: number;
  catalog: CatalogService[];
  smallBusiness: boolean;
  onChange: (patch: Partial<Row>) => void;
  onMove: (d: -1 | 1) => void;
  onMoveTo: (fromKey: string) => void;
  onAddPart: (s: CatalogService) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [saving, startSaving] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<"part" | "row" | null>(null);
  const [draggable, setDraggable] = useState(false);
  const net = rowNet(row);
  const item = toItem(row);
  const total = lineNet(item);
  const price = parseDecimal(row.price) ?? 0;
  const other = row.price_mode === "netto" ? grossFromNet(price, row.vat_rate) : net;

  const switchMode = (mode: "netto" | "brutto") => {
    if (mode === row.price_mode) return;
    const p = parseDecimal(row.price);
    if (p === null) return onChange({ price_mode: mode });
    const converted = mode === "brutto" ? grossFromNet(p, row.vat_rate) : netFromGross(p, row.vat_rate);
    onChange({ price_mode: mode, price: fmtInput(converted, Math.round(converted * 100) === converted * 100 ? 2 : 4) });
  };

  const saveToCatalog = () =>
    startSaving(async () => {
      const res = await addServiceFromEditor({
        name: row.description,
        description: row.details,
        unit: row.unit,
        price_net: net,
        vat_rate: row.vat_rate,
        favorite: true,
        calc_type: row.price_per > 1 ? "menge" : calcTypeFromUnit(row.unit),
        price_per: row.price_per,
      });
      if ("id" in res && res.id) {
        onChange({ service_id: res.id, saved: true });
        setSaveMsg("Im Katalog gespeichert");
      } else setSaveMsg(res.error ?? "Fehler");
    });

  return (
    <li
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_ROW, row.key);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => setDraggable(false)}
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types);
        if (types.includes(DND_SERVICE)) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
          setDropHint("part");
        } else if (types.includes(DND_ROW)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDropHint("row");
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropHint(null);
      }}
      onDrop={(e) => {
        setDropHint(null);
        const sid = e.dataTransfer.getData(DND_SERVICE);
        const rk = e.dataTransfer.getData(DND_ROW);
        if (sid) {
          e.preventDefault();
          e.stopPropagation();
          const sv = catalog.find((c) => c.id === sid);
          if (sv) onAddPart(sv);
        } else if (rk) {
          e.preventDefault();
          onMoveTo(rk);
        }
      }}
      className={cn(
        "group relative px-3 py-4 transition-colors sm:px-5",
        dropHint === "part" && "bg-accent/[0.05] ring-2 ring-inset ring-accent",
        dropHint === "row" && "shadow-[inset_0_3px_0_0_var(--color-accent)]",
      )}
    >
      {dropHint === "part" ? (
        <span className="pointer-events-none absolute right-5 top-2 z-10 rounded-full bg-accent px-2.5 py-0.5 text-xs text-white">Als Baustein hinzufügen</span>
      ) : null}
      <div className="flex items-start gap-2 sm:gap-3">
        <span
          className="mt-2 flex w-5 shrink-0 cursor-grab items-center text-xs tabular-nums text-stone active:cursor-grabbing sm:w-7"
          onMouseDown={() => setDraggable(true)}
          onMouseUp={() => setDraggable(false)}
          title="Ziehen zum Sortieren"
        >
          <GripVertical className="hidden size-3.5 opacity-0 transition-opacity group-hover:opacity-100 sm:block" aria-hidden />
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="grid gap-2 md:grid-cols-12">
            <input
              aria-label="Bezeichnung"
              value={row.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Bezeichnung der Leistung"
              className={cn("adm-input font-medium", row.calc ? "md:col-span-9" : "md:col-span-12")}
            />
            {row.calc ? (
              <VatSelect value={row.vat_rate} disabled={smallBusiness} onChange={(v) => onChange({ vat_rate: v })} className="md:col-span-3" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 md:col-span-4">
                  <input
                    aria-label="Menge"
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={(e) => onChange({ quantity: e.target.value })}
                    placeholder={row.unit === "Std." ? "1:30" : "1"}
                    title={row.unit === "Std." ? "Stunden – auch als 1:30 möglich" : undefined}
                    className="adm-input text-right"
                  />
                  <select aria-label="Einheit" value={row.unit} onChange={(e) => onChange({ unit: e.target.value, price_per: e.target.value === "Stk." ? row.price_per : 1 })} className="adm-input">
                    {[...new Set([row.unit, ...units])].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 md:col-span-5">
                  <div className="relative flex-1">
                    <input
                      aria-label={`Einzelpreis ${row.price_mode}`}
                      inputMode="decimal"
                      value={row.price}
                      onChange={(e) => onChange({ price: e.target.value })}
                      placeholder="0,00"
                      className="adm-input pr-8 text-right"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone">€</span>
                  </div>
                  {row.unit === "Stk." ? (
                    <select
                      aria-label="Preis gilt je"
                      title="Preis gilt je … Stück"
                      value={row.price_per}
                      onChange={(e) => onChange({ price_per: Number(e.target.value) })}
                      className="adm-input w-[5.5rem] shrink-0 px-2 text-xs"
                    >
                      {[...new Set([row.price_per, ...pricePerOptions])].sort((a, b) => a - b).map((o) => (
                        <option key={o} value={o}>
                          je {formatQty(o)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <div className="flex h-10 shrink-0 rounded-[0.6rem] bg-ink/[0.05] p-0.5 text-xs" role="group" aria-label="Preisart">
                    {(["netto", "brutto"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => switchMode(m)}
                        aria-pressed={row.price_mode === m}
                        className={cn("rounded-lg px-2.5 capitalize", row.price_mode === m ? "bg-white font-medium shadow-sm" : "text-stone-dark hover:text-ink")}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <VatSelect value={row.vat_rate} disabled={smallBusiness} onChange={(v) => onChange({ vat_rate: v })} className="md:col-span-3" />
              </>
            )}
          </div>

          {row.calc ? <CalcEditor calc={row.calc} catalog={catalog} onChange={(calc) => onChange({ calc })} onAddPart={onAddPart} vat={row.vat_rate} /> : null}

          {row.showDetails ? (
            <textarea
              aria-label="Beschreibung"
              value={row.details}
              onChange={(e) => onChange({ details: e.target.value })}
              rows={2}
              placeholder="Beschreibung / Details (optional, erscheint klein unter der Bezeichnung)"
              className="adm-input text-sm"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-dark">
            {row.calc ? (
              <span className="tabular-nums">
                {formatQty(item.quantity)} {item.unit} × {formatEuro(item.unit_price)} netto
              </span>
            ) : (
              <span className="tabular-nums">
                {row.price_mode === "netto" ? "Brutto" : "Netto"}: {formatEuro(other)} / {row.price_per > 1 ? `${formatQty(row.price_per)} ` : ""}
                {row.unit}
              </span>
            )}
            {!row.showDetails ? (
              <button type="button" className="hover:text-accent" onClick={() => onChange({ showDetails: true })}>
                + Beschreibung
              </button>
            ) : null}
            {!row.calc ? (
              <button type="button" className="inline-flex items-center gap-1 hover:text-accent" onClick={() => onChange({ calc: rowToCalc(row) })}>
                <Puzzle className="size-3.5" aria-hidden /> Bausteine / Maße
              </button>
            ) : null}
            {!row.service_id && !row.calc && row.description.trim() ? (
              <button type="button" className="inline-flex items-center gap-1 hover:text-accent" onClick={saveToCatalog} disabled={saving}>
                {saving ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <BookmarkPlus className="size-3.5" aria-hidden />} In Katalog speichern
              </button>
            ) : null}
            {row.service_id ? <span className="text-emerald-700">✓ Katalogleistung</span> : null}
            {saveMsg ? <span className="text-emerald-700">{saveMsg}</span> : null}
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <span className="mt-2 text-sm font-semibold tabular-nums">{formatEuro(total)}</span>
          <div className="flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
            <IconBtn label="Nach oben" onClick={() => onMove(-1)} disabled={index === 0}>
              <ArrowUp className="size-3.5" />
            </IconBtn>
            <IconBtn label="Nach unten" onClick={() => onMove(1)} disabled={index === count - 1}>
              <ArrowDown className="size-3.5" />
            </IconBtn>
            <IconBtn label="Duplizieren" onClick={onDuplicate}>
              <Copy className="size-3.5" />
            </IconBtn>
            <IconBtn label="Entfernen" onClick={onRemove} danger>
              <Trash2 className="size-3.5" />
            </IconBtn>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-ink/[0.06] pt-2 sm:hidden">
        <div className="flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
            <IconBtn label="Nach oben" onClick={() => onMove(-1)} disabled={index === 0}>
              <ArrowUp className="size-3.5" />
            </IconBtn>
            <IconBtn label="Nach unten" onClick={() => onMove(1)} disabled={index === count - 1}>
              <ArrowDown className="size-3.5" />
            </IconBtn>
            <IconBtn label="Duplizieren" onClick={onDuplicate}>
              <Copy className="size-3.5" />
            </IconBtn>
            <IconBtn label="Entfernen" onClick={onRemove} danger>
              <Trash2 className="size-3.5" />
            </IconBtn>
          </div>
        <span className="text-sm font-semibold tabular-nums">{formatEuro(total)}</span>
      </div>
    </li>
  );
}

function VatSelect({ value, disabled, onChange, className }: { value: VatRate; disabled: boolean; onChange: (v: VatRate) => void; className?: string }) {
  return (
    <select aria-label="Umsatzsteuer" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value) as VatRate)} className={cn("adm-input", className)}>
      {vatRates.map((v) => (
        <option key={v} value={v}>
          {v} % USt.
        </option>
      ))}
    </select>
  );
}

/** Zahlenfeld mit deutscher Eingabe ("1,5", "1:30"); behält die Eingabe beim Tippen */
function NumField({
  value,
  onChange,
  className,
  label,
  placeholder,
  allowTime,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  className?: string;
  label: string;
  placeholder?: string;
  allowTime?: boolean;
}) {
  const fmt = (n: number | null) => (n === null ? "" : formatQty(n).replace(/\./g, ""));
  const [text, setText] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : fmt(value);
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      placeholder={placeholder}
      value={shown}
      onFocus={() => {
        setText(fmt(value));
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        const n = allowTime ? parseQtyInput(e.target.value) : parseDecimal(e.target.value);
        onChange(e.target.value.trim() === "" ? null : n);
      }}
      className={cn("adm-input text-right tabular-nums", className)}
    />
  );
}

/** Rechner: Anzahl, Format und Bausteine – Mengen werden automatisch berechnet */
function CalcEditor({
  calc,
  catalog,
  vat,
  onChange,
  onAddPart,
}: {
  calc: ItemCalc;
  catalog: CatalogService[];
  vat: VatRate;
  onChange: (c: ItemCalc) => void;
  onAddPart: (s: CatalogService) => void;
}) {
  const [palette, setPalette] = useState(false);
  const needsFormat = calcNeedsFormat(calc);
  const area = calcArea(calc);
  const totalNet = calc.parts.reduce((s, p) => s + partTotal(p, calc), 0);
  const setPart = (i: number, patch: Partial<CalcPart>) => onChange({ ...calc, parts: calc.parts.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const removePart = (i: number) => onChange({ ...calc, parts: calc.parts.filter((_, j) => j !== i) });
  const movePart = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= calc.parts.length) return;
    const parts = [...calc.parts];
    [parts[i], parts[j]] = [parts[j], parts[i]];
    onChange({ ...calc, parts });
  };

  return (
    <div className="-mx-1 rounded-xl bg-[#f7f5f1] p-2 ring-1 ring-ink/[0.06] sm:mx-0 sm:p-3">
      {/* Anzahl & Format */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-24">
          <span className="adm-label">Anzahl</span>
          <NumField label="Anzahl" value={calc.count} onChange={(n) => onChange({ ...calc, count: Math.max(0, n ?? 0) })} />
        </div>
        {needsFormat ? (
          <>
            <div className="w-24">
              <span className="adm-label">Breite (cm)</span>
              <NumField label="Breite in cm" placeholder="z. B. 120" value={calc.width_cm} onChange={(n) => onChange({ ...calc, width_cm: n && n > 0 ? n : null })} />
            </div>
            <span className="pb-2.5 text-stone">×</span>
            <div className="w-24">
              <span className="adm-label">Höhe (cm)</span>
              <NumField label="Höhe in cm" placeholder="z. B. 80" value={calc.height_cm} onChange={(n) => onChange({ ...calc, height_cm: n && n > 0 ? n : null })} />
            </div>
            <span className="pb-2.5 text-sm tabular-nums text-stone-dark">{area !== null ? `= ${formatQty(area)} m²` : "Maße eingeben"}</span>
          </>
        ) : null}
      </div>

      {/* Bausteine */}
      <ul className="mt-3 space-y-1.5">
        {calc.parts.map((p, i) => {
          const qty = partQty(p, calc);
          const autoOn = p.auto && canAuto(p, calc);
          const unit = calcTypeInfo[p.calc_type].unit;
          return (
            <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-white px-2 py-2 ring-1 sm:px-2.5 ring-ink/[0.06] sm:grid-cols-[auto_minmax(0,1fr)_7.5rem_9rem_5.5rem_auto]">
              <span className="grid size-7 place-items-center rounded-md bg-ink/[0.04]" title={calcTypeInfo[p.calc_type].label}>
                <CalcTypeIcon type={p.calc_type} className="size-3.5 text-stone-dark" />
              </span>
              <input aria-label="Baustein" value={p.name} onChange={(e) => setPart(i, { name: e.target.value })} className="adm-input h-8 min-w-0 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none" />
              <span className="text-right text-sm font-semibold tabular-nums sm:hidden">{formatEuro(partTotal(p, calc))}</span>

              <div className="col-span-3 grid grid-cols-[1fr_1fr_auto] items-center gap-1.5 sm:contents">
              <div className="flex items-center gap-1">
                <NumField
                  label={`Menge ${p.name}`}
                  allowTime={p.calc_type === "stunde"}
                  value={qty}
                  onChange={(n) => setPart(i, { qty: Math.max(0, n ?? 0), auto: false })}
                  className={cn("h-8 min-w-0 flex-1 px-2 text-sm", autoOn && "bg-emerald-50/60 text-emerald-900")}
                />
                <span className="shrink-0 text-xs text-stone-dark sm:w-9">{unit === "Pauschal" ? "x" : unit}</span>
              </div>
              <div className="flex items-center gap-1">
                <NumField label={`Preis ${p.name}`} value={p.price_net} onChange={(n) => setPart(i, { price_net: n ?? 0 })} className="h-8 min-w-0 flex-1 px-2 text-sm" />
                <span className="shrink-0 whitespace-nowrap text-xs text-stone-dark">€{p.price_per > 1 ? `/${formatQty(p.price_per)}` : p.calc_type === "pauschal" ? "" : `/${unit}`}</span>
              </div>
              <span className="hidden text-right text-sm font-semibold tabular-nums sm:block">{formatEuro(partTotal(p, calc))}</span>
              <div className="flex items-center justify-end gap-0.5">
                {!autoOn && canAuto(p, calc) ? (
                  <button type="button" onClick={() => setPart(i, { auto: true })} title="Menge wieder automatisch berechnen" className="grid size-6 place-items-center rounded text-stone-dark hover:bg-ink/[0.06] hover:text-accent">
                    <RotateCcw className="size-3.5" />
                  </button>
                ) : null}
                <button type="button" aria-label="Nach oben" disabled={i === 0} onClick={() => movePart(i, -1)} className="hidden size-6 place-items-center rounded text-stone-dark hover:bg-ink/[0.06] disabled:opacity-30 sm:grid">
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" aria-label="Baustein entfernen" onClick={() => removePart(i)} className="grid size-6 place-items-center rounded text-stone-dark hover:bg-red-50 hover:text-red-700">
                  <X className="size-3.5" />
                </button>
              </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Baustein hinzufügen */}
      <div className="mt-2">
        {palette ? (
          <div className="rounded-lg border-2 border-dashed border-ink/10 bg-white/60 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs text-stone-dark">Baustein anklicken oder auf die Position ziehen:</span>
              <button type="button" onClick={() => setPalette(false)} className="text-xs text-stone-dark hover:text-ink">
                Schließen
              </button>
            </div>
            <ServicePalette catalog={catalog} onPick={onAddPart} compact limit={24} />
          </div>
        ) : (
          <button type="button" onClick={() => setPalette(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-ink/10 py-2 text-sm text-stone-dark transition-colors hover:border-accent hover:text-accent">
            <Plus className="size-4" aria-hidden /> Baustein hinzufügen (oder hierher ziehen)
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-dark">
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-emerald-400 align-middle" /> grün = automatisch aus Anzahl/Maßen berechnet · Stunden auch als „1:30“
        </span>
        <span className="tabular-nums">
          Summe {formatEuro(totalNet)} netto · {formatEuro(grossFromNet(totalNet, vat))} brutto
          {calc.count > 1 ? ` · ${formatEuro(totalNet / calc.count)} netto je Stück` : ""}
        </span>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn("grid size-7 place-items-center rounded-md text-stone-dark hover:bg-ink/[0.06] disabled:opacity-30", danger && "hover:bg-red-50 hover:text-red-700")}
    >
      {children}
    </button>
  );
}
