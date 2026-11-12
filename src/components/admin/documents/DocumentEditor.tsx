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
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { saveDocument, type ActionState } from "@/app/admin/document-actions";
import { addServiceFromEditor } from "@/app/admin/service-actions";
import {
  computeTotals,
  formatEuro,
  formatNumber,
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
  vat_rate: VatRate;
  showDetails: boolean;
  saved?: boolean;
};

let seq = 0;
const newKey = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
const fmtInput = (n: number, digits = 2) => formatNumber(n, digits).replace(/\./g, "");

function toRow(it: DocItem): Row {
  const mode = it.price_mode ?? "netto";
  const price = mode === "brutto" ? grossFromNet(it.unit_price, it.vat_rate) : it.unit_price;
  const decimals = Math.round(price * 100) === price * 100 ? 2 : 4;
  return {
    key: newKey(),
    service_id: it.service_id ?? null,
    description: it.description,
    details: it.details ?? "",
    quantity: fmtInput(it.quantity, Number.isInteger(it.quantity) ? 0 : 2),
    unit: it.unit,
    price: fmtInput(price, decimals),
    price_mode: mode,
    vat_rate: it.vat_rate,
    showDetails: !!it.details,
  };
}

function rowNet(r: Row): number {
  const price = parseDecimal(r.price) ?? 0;
  return r.price_mode === "brutto" ? netFromGross(price, r.vat_rate) : price;
}

function toItem(r: Row): DocItem {
  return {
    service_id: r.service_id,
    description: r.description.trim(),
    details: r.details.trim() || undefined,
    quantity: parseDecimal(r.quantity) ?? 0,
    unit: r.unit,
    unit_price: rowNet(r),
    vat_rate: r.vat_rate,
    price_mode: r.price_mode,
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

  const addService = (s: CatalogService) =>
    setRows((rs) => [
      ...rs,
      {
        key: newKey(),
        service_id: s.id,
        description: s.name,
        details: s.description ?? "",
        quantity: "1",
        unit: s.unit,
        price: fmtInput(s.price_net),
        price_mode: "netto",
        vat_rate: smallBusiness ? 0 : s.vat_rate,
        showDetails: !!s.description,
        saved: true,
      },
    ]);
  const addFree = (name = "") =>
    setRows((rs) => [
      ...rs,
      { key: newKey(), service_id: null, description: name, details: "", quantity: "1", unit: "Stk.", price: "", price_mode: "netto", vat_rate: smallBusiness ? 0 : defaultVat, showDetails: false },
    ]);

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
            <CatalogBar catalog={catalog} onPick={addService} onFree={addFree} />

            {rows.length === 0 ? (
              <p className="px-5 pb-6 pt-2 text-sm text-stone-dark">Noch keine Positionen. Wählen Sie eine Leistung aus dem Katalog oder fügen Sie eine freie Position hinzu.</p>
            ) : (
              <ol className="divide-y divide-ink/[0.06]">
                {rows.map((r, i) => (
                  <ItemRow
                    key={r.key}
                    index={i}
                    row={r}
                    count={rows.length}
                    smallBusiness={smallBusiness}
                    onChange={(patch) => updateRow(r.key, patch)}
                    onMove={(d) => move(i, d)}
                    onDuplicate={() => setRows((rs) => [...rs.slice(0, i + 1), { ...r, key: newKey() }, ...rs.slice(i + 1)])}
                    onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  />
                ))}
              </ol>
            )}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(s);
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink/[0.04]"
              >
                {s.is_favorite ? <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden /> : <span className="size-3.5 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{s.name}</span>
                  {s.category ? <span className="block text-xs text-stone-dark">{s.category}</span> : null}
                </span>
                <span className="shrink-0 text-right text-xs tabular-nums">
                  <span className="block font-medium">{formatEuro(s.price_net)} netto</span>
                  <span className="block text-stone-dark">
                    {formatEuro(grossFromNet(s.price_net, s.vat_rate))} brutto / {s.unit}
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
      {favorites.length ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="mr-1 self-center text-xs text-stone-dark">Häufig:</span>
          {favorites.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink/[0.04] px-3 text-[0.8rem] transition-colors hover:bg-accent hover:text-white"
              title={`${formatEuro(s.price_net)} netto · ${formatEuro(grossFromNet(s.price_net, s.vat_rate))} brutto`}
            >
              <Plus className="size-3.5" aria-hidden /> {s.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ItemRow({
  index,
  row,
  count,
  smallBusiness,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  index: number;
  row: Row;
  count: number;
  smallBusiness: boolean;
  onChange: (patch: Partial<Row>) => void;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [saving, startSaving] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const net = rowNet(row);
  const total = lineNet({ quantity: parseDecimal(row.quantity) ?? 0, unit_price: net });
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
      const res = await addServiceFromEditor({ name: row.description, description: row.details, unit: row.unit, price_net: net, vat_rate: row.vat_rate, favorite: true });
      if ("id" in res && res.id) {
        onChange({ service_id: res.id, saved: true });
        setSaveMsg("Im Katalog gespeichert");
      } else setSaveMsg(res.error ?? "Fehler");
    });

  return (
    <li className="group px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-2.5 w-6 shrink-0 text-xs tabular-nums text-stone">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="grid gap-2 md:grid-cols-12">
            <input
              aria-label="Bezeichnung"
              value={row.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Bezeichnung der Leistung"
              className="adm-input font-medium md:col-span-12"
            />
            <div className="grid grid-cols-2 gap-2 md:col-span-4">
              <input aria-label="Menge" inputMode="decimal" value={row.quantity} onChange={(e) => onChange({ quantity: e.target.value })} className="adm-input text-right" />
              <select aria-label="Einheit" value={row.unit} onChange={(e) => onChange({ unit: e.target.value })} className="adm-input">
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
            <select
              aria-label="Umsatzsteuer"
              value={row.vat_rate}
              disabled={smallBusiness}
              onChange={(e) => {
                const rate = Number(e.target.value) as VatRate;
                // Bei Brutto-Eingabe bleibt der Bruttopreis gleich, sonst der Nettopreis
                onChange({ vat_rate: rate });
              }}
              className="adm-input md:col-span-3"
            >
              {vatRates.map((v) => (
                <option key={v} value={v}>
                  {v} % USt.
                </option>
              ))}
            </select>
          </div>
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
            <span className="tabular-nums">
              {row.price_mode === "netto" ? "Brutto" : "Netto"}: {formatEuro(other)} / {row.unit}
            </span>
            {!row.showDetails ? (
              <button type="button" className="hover:text-accent" onClick={() => onChange({ showDetails: true })}>
                + Beschreibung
              </button>
            ) : null}
            {!row.service_id && row.description.trim() ? (
              <button type="button" className="inline-flex items-center gap-1 hover:text-accent" onClick={saveToCatalog} disabled={saving}>
                {saving ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <BookmarkPlus className="size-3.5" aria-hidden />} In Katalog speichern
              </button>
            ) : null}
            {row.service_id ? <span className="text-emerald-700">✓ Katalogleistung</span> : null}
            {saveMsg ? <span className="text-emerald-700">{saveMsg}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
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
    </li>
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
