import "server-only";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings/server";
import { addDays, greetingLine, isStatusFor, todayBerlin, type DocItem, type DocStatus, type DocumentKind, type VatRate } from "./format";

export type Doc = {
  id: string;
  kind: DocumentKind;
  number: string | null;
  status: DocStatus;
  customer_id: string | null;
  source_document_id: string | null;
  inquiry_id: string | null;
  title: string;
  customer_salutation: string | null;
  customer_name: string;
  company_name: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  customer_vat_id: string | null;
  doc_date: string;
  valid_until: string | null;
  due_date: string | null;
  service_period: string | null;
  reference: string | null;
  intro: string | null;
  items: DocItem[];
  discount_percent: number;
  notes: string | null;
  payment_terms: string | null;
  closing: string | null;
  net_total: number;
  vat_total: number;
  gross_total: number;
  paid_amount: number;
  paid_at: string | null;
  finalized_at: string | null;
  share_token: string;
  share_enabled: boolean;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  accepted_at: string | null;
  accepted_name: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  last_sent_at: string | null;
  last_sent_to: string | null;
  send_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const num = (v: unknown) => Number(v ?? 0);
const rate = (v: unknown): VatRate => (Number(v) === 7 ? 7 : Number(v) === 0 ? 0 : 19);

export function normalizeDoc(row: Record<string, unknown>): Doc {
  const kind = row.kind === "rechnung" ? "rechnung" : "angebot";
  const items = Array.isArray(row.items) ? (row.items as DocItem[]) : [];
  return {
    ...(row as unknown as Doc),
    kind,
    status: isStatusFor(kind, row.status) ? (row.status as DocStatus) : "entwurf",
    items: items.map((i) => ({ ...i, quantity: num(i.quantity), unit_price: num(i.unit_price), vat_rate: rate(i.vat_rate) })),
    discount_percent: num(row.discount_percent),
    net_total: num(row.net_total),
    vat_total: num(row.vat_total),
    gross_total: num(row.gross_total),
    paid_amount: num(row.paid_amount),
    view_count: num(row.view_count),
    send_count: num(row.send_count),
  };
}

export const PAGE_SIZE = 25;
const LIST_COLUMNS =
  "id, kind, number, status, title, customer_id, customer_name, company_name, gross_total, paid_amount, doc_date, valid_until, due_date, created_at, accepted_at, first_viewed_at, view_count, last_sent_at, items, discount_percent, net_total, vat_total";

export async function listDocuments(opts: { kind: DocumentKind; status?: string; q?: string; page: number; customerId?: string }) {
  const today = todayBerlin();
  let query = db()
    .from("documents")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("kind", opts.kind)
    .order("created_at", { ascending: false })
    .range((opts.page - 1) * PAGE_SIZE, opts.page * PAGE_SIZE - 1);
  if (opts.customerId) query = query.eq("customer_id", opts.customerId);
  if (opts.status === "abgelaufen") query = query.eq("status", "versendet").lt("valid_until", today);
  else if (opts.status === "ueberfaellig") query = query.in("status", ["offen", "teilbezahlt"]).lt("due_date", today);
  else if (opts.status && isStatusFor(opts.kind, opts.status)) query = query.eq("status", opts.status);
  if (opts.q) {
    const q = opts.q.replace(/[,%*()]/g, " ").trim();
    if (q) query = query.or(`number.ilike.*${q}*,customer_name.ilike.*${q}*,company_name.ilike.*${q}*,title.ilike.*${q}*`);
  }
  const { data, count } = await query;
  return { rows: (data ?? []).map((r) => normalizeDoc(r as Record<string, unknown>)), total: count ?? 0 };
}

export async function getDocument(id: string): Promise<Doc | null> {
  const { data } = await db().from("documents").select("*").eq("id", id).maybeSingle();
  return data ? normalizeDoc(data) : null;
}

export async function getDocumentByToken(token: string): Promise<Doc | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const { data } = await db().from("documents").select("*").eq("share_token", token).eq("share_enabled", true).maybeSingle();
  if (!data) return null;
  const doc = normalizeDoc(data);
  // Rechnungsentwürfe sind nie öffentlich
  if (doc.kind === "rechnung" && !doc.number) return null;
  return doc;
}

export async function documentEvents(id: string) {
  const { data } = await db().from("document_events").select("id, type, note, actor, created_at").eq("document_id", id).order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function relatedDocuments(id: string) {
  const { data } = await db().from("documents").select("id, kind, number, status, gross_total").eq("source_document_id", id).order("created_at");
  return data ?? [];
}

export type DocDraft = Omit<
  Doc,
  | "id" | "number" | "status" | "net_total" | "vat_total" | "gross_total" | "paid_amount" | "paid_at" | "finalized_at" | "share_token"
  | "share_enabled" | "first_viewed_at" | "last_viewed_at" | "view_count" | "accepted_at" | "accepted_name" | "declined_at"
  | "decline_reason" | "last_sent_at" | "last_sent_to" | "send_count" | "created_by" | "created_at" | "updated_at"
>;

/** Leeres Dokument – optional vorbefüllt aus Kunde oder Anfrage */
export async function newDraft(kind: DocumentKind, opts: { customerId?: string | null; inquiryId?: string | null }): Promise<DocDraft> {
  const settings = await getSettings();
  const today = todayBerlin();
  const texts = kind === "angebot" ? settings.offers : settings.invoices;
  const draft: DocDraft = {
    kind,
    customer_id: null,
    source_document_id: null,
    inquiry_id: null,
    title: kind === "angebot" ? "Angebot" : "Rechnung",
    customer_salutation: null,
    customer_name: "",
    company_name: null,
    street: null,
    postal_code: null,
    city: null,
    country: "Deutschland",
    email: null,
    phone: null,
    customer_vat_id: null,
    doc_date: today,
    valid_until: kind === "angebot" ? addDays(today, settings.offers.validityDays) : null,
    due_date: kind === "rechnung" ? addDays(today, settings.invoices.dueDays) : null,
    service_period: kind === "rechnung" ? new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date()) : null,
    reference: null,
    intro: `${greetingLine(null, "")}\n\n${texts.intro}`,
    items: [],
    discount_percent: 0,
    notes: texts.notes || null,
    payment_terms: texts.paymentTerms || null,
    closing: texts.closing || null,
  };

  let customerId = opts.customerId ?? null;
  if (opts.inquiryId) {
    const { data: inq } = await db().from("inquiries").select("id, reference, name, company_name, email, phone, message, customer_id").eq("id", opts.inquiryId).maybeSingle();
    if (inq) {
      draft.inquiry_id = inq.id;
      draft.reference = `Ihre Anfrage ${inq.reference}`;
      draft.customer_name = inq.name;
      draft.company_name = inq.company_name;
      draft.email = inq.email;
      draft.phone = inq.phone;
      customerId = customerId ?? inq.customer_id;
    }
  }
  if (customerId) {
    const { data: c } = await db().from("customers").select("*").eq("id", customerId).maybeSingle();
    if (c) {
      Object.assign(draft, {
        customer_id: c.id,
        customer_salutation: c.salutation,
        customer_name: c.name,
        company_name: c.company_name,
        street: c.street,
        postal_code: c.postal_code,
        city: c.city,
        country: c.country,
        email: c.email,
        phone: c.phone,
        customer_vat_id: c.vat_id,
      });
    }
  }
  draft.intro = `${greetingLine(draft.customer_salutation, draft.customer_name)}\n\n${texts.intro}`;
  return draft;
}

export type CatalogService = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  price_net: number;
  vat_rate: VatRate;
  is_favorite: boolean;
  active: boolean;
  usage_count: number;
  sort_order: number;
};

export async function listCatalog(includeInactive = false): Promise<CatalogService[]> {
  let q = db().from("service_catalog").select("id, name, description, category, unit, price_net, vat_rate, is_favorite, active, usage_count, sort_order");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q.order("is_favorite", { ascending: false }).order("usage_count", { ascending: false }).order("sort_order").order("name");
  return (data ?? []).map((s) => ({ ...s, price_net: num(s.price_net), vat_rate: rate(s.vat_rate), usage_count: num(s.usage_count) })) as CatalogService[];
}

export type CustomerOption = { id: string; customer_number: string; name: string; company_name: string | null; email: string | null; city: string | null };

export async function customerOptions(): Promise<CustomerOption[]> {
  const { data } = await db().from("customers").select("id, customer_number, name, company_name, email, city").order("updated_at", { ascending: false }).limit(500);
  return (data ?? []) as CustomerOption[];
}
