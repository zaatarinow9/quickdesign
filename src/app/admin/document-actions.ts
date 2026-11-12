"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { clientIpHash, isToken, rateLimit } from "@/lib/security";
import { getSettings } from "@/lib/settings/server";
import { logActivity, logDocumentEvent } from "@/lib/admin/log";
import { mailCompany } from "@/lib/admin/company";
import { sendMail } from "@/lib/email/send";
import { documentEmail, offerAcceptedEmail } from "@/lib/email/templates";
import {
  addDays,
  computeTotals,
  documentFilename,
  formatDateDE,
  formatEuro,
  greetingLine,
  isStatusFor,
  kindLabels,
  parseDecimal,
  todayBerlin,
  type DocItem,
  type DocumentKind,
} from "@/lib/documents/format";
import { getDocument, normalizeDoc } from "@/lib/documents/queries";
import { renderDocumentPdf } from "@/lib/documents/pdf";

export type ActionState = { ok?: string; error?: string };

const uuid = z.uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optText = (max: number) => z.string().trim().max(max).nullable();

const itemSchema = z.object({
  service_id: uuid.nullable().optional(),
  description: z.string().trim().min(1, { error: "Jede Position braucht eine Bezeichnung." }).max(300),
  details: z.string().trim().max(1500).optional(),
  quantity: z.number({ error: "Ungültige Menge." }).min(0).max(1_000_000),
  unit: z.string().trim().min(1).max(20),
  unit_price: z.number({ error: "Ungültiger Preis." }).min(-1_000_000).max(1_000_000),
  vat_rate: z.union([z.literal(19), z.literal(7), z.literal(0)]),
  price_mode: z.enum(["netto", "brutto"]).optional(),
});

const docSchema = z.object({
  kind: z.enum(["angebot", "rechnung"]),
  customer_id: uuid.nullable(),
  inquiry_id: uuid.nullable(),
  source_document_id: uuid.nullable(),
  title: z.string().trim().min(1).max(200),
  customer_salutation: z.enum(["Herr", "Frau", "Divers", ""]).transform((v) => v || null),
  customer_name: z.string().trim().min(2, { error: "Bitte den Namen des Kunden angeben." }).max(160),
  company_name: optText(160),
  street: optText(160),
  postal_code: optText(12),
  city: optText(80),
  country: optText(60),
  email: z.email({ error: "Die E-Mail-Adresse des Kunden ist ungültig." }).max(254).nullable(),
  phone: optText(60),
  customer_vat_id: optText(40),
  doc_date: dateStr,
  valid_until: dateStr.nullable(),
  due_date: dateStr.nullable(),
  service_period: optText(120),
  reference: optText(120),
  intro: optText(4000),
  items: z.array(itemSchema).min(1, { error: "Bitte mindestens eine Position hinzufügen." }).max(100),
  discount_percent: z.number().min(0).max(100),
  notes: optText(4000),
  payment_terms: optText(1500),
  closing: optText(1500),
});

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;

function paths(kind: DocumentKind, id?: string) {
  const base = `/admin/${kindLabels[kind].path}`;
  revalidatePath(base);
  revalidatePath("/admin");
  if (id) revalidatePath(`${base}/${id}`);
}

/** Kunde automatisch anlegen/verknüpfen (über die E-Mail-Adresse) */
async function ensureCustomer(data: z.infer<typeof docSchema>, actor: string): Promise<string | null> {
  if (data.customer_id) return data.customer_id;
  const client = db();
  if (data.email) {
    const { data: existing } = await client.from("customers").select("id").eq("email", data.email.toLowerCase()).maybeSingle();
    if (existing) return existing.id;
  }
  const { data: created } = await client
    .from("customers")
    .insert({
      kind: data.company_name ? "firma" : "privat",
      salutation: data.customer_salutation,
      name: data.customer_name,
      company_name: data.company_name,
      email: data.email?.toLowerCase() ?? null,
      phone: data.phone,
      street: data.street,
      postal_code: data.postal_code,
      city: data.city,
      country: data.country || "Deutschland",
      vat_id: data.customer_vat_id,
      source: data.kind,
      created_by: actor,
    })
    .select("id")
    .single();
  return created?.id ?? null;
}

async function bumpServiceUsage(items: DocItem[]) {
  const ids = [...new Set(items.map((i) => i.service_id).filter((v): v is string => !!v))];
  if (!ids.length) return;
  const client = db();
  const { data } = await client.from("service_catalog").select("id, usage_count").in("id", ids);
  await Promise.all(
    (data ?? []).map((s) => client.from("service_catalog").update({ usage_count: Number(s.usage_count) + 1, last_used_at: new Date().toISOString() }).eq("id", s.id)),
  );
}

export async function saveDocument(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const id = str(fd, "id");
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(str(fd, "items") || "[]");
  } catch {
    return { error: "Die Positionen konnten nicht gelesen werden." };
  }
  const items = Array.isArray(rawItems)
    ? rawItems
        .map((i: Record<string, unknown>) => ({
          service_id: typeof i.service_id === "string" && i.service_id ? i.service_id : null,
          description: String(i.description ?? ""),
          details: String(i.details ?? ""),
          quantity: parseDecimal(i.quantity as string) ?? Number.NaN,
          unit: String(i.unit ?? "Stk.") || "Stk.",
          unit_price: parseDecimal(i.unit_price as string) ?? Number.NaN,
          vat_rate: Number(i.vat_rate ?? 19),
          price_mode: i.price_mode === "brutto" ? ("brutto" as const) : ("netto" as const),
        }))
        .filter((i) => i.description.trim() || i.unit_price)
    : [];

  const parsed = docSchema.safeParse({
    kind: str(fd, "kind"),
    customer_id: opt(fd, "customer_id"),
    inquiry_id: opt(fd, "inquiry_id"),
    source_document_id: opt(fd, "source_document_id"),
    title: str(fd, "title") || (str(fd, "kind") === "rechnung" ? "Rechnung" : "Angebot"),
    customer_salutation: str(fd, "customer_salutation"),
    customer_name: str(fd, "customer_name"),
    company_name: opt(fd, "company_name"),
    street: opt(fd, "street"),
    postal_code: opt(fd, "postal_code"),
    city: opt(fd, "city"),
    country: opt(fd, "country"),
    email: opt(fd, "email"),
    phone: opt(fd, "phone"),
    customer_vat_id: opt(fd, "customer_vat_id"),
    doc_date: str(fd, "doc_date"),
    valid_until: opt(fd, "valid_until"),
    due_date: opt(fd, "due_date"),
    service_period: opt(fd, "service_period"),
    reference: opt(fd, "reference"),
    intro: opt(fd, "intro"),
    items,
    discount_percent: parseDecimal(str(fd, "discount_percent")) ?? 0,
    notes: opt(fd, "notes"),
    payment_terms: opt(fd, "payment_terms"),
    closing: opt(fd, "closing"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bitte prüfen Sie Ihre Eingaben." };
  const data = parsed.data;
  if (data.valid_until && data.valid_until < data.doc_date) return { error: "„Gültig bis“ liegt vor dem Angebotsdatum." };
  if (data.due_date && data.due_date < data.doc_date) return { error: "Das Fälligkeitsdatum liegt vor dem Rechnungsdatum." };

  const settings = await getSettings();
  const cleanItems: DocItem[] = data.items.map((i) => ({ ...i, details: i.details || undefined, vat_rate: settings.tax.smallBusiness ? 0 : i.vat_rate }));
  const t = computeTotals(cleanItems, data.discount_percent, settings.tax.smallBusiness);
  const client = db();

  if (id) {
    if (!uuid.safeParse(id).success) return { error: "Ungültiges Dokument." };
    const { data: current } = await client.from("documents").select("kind, status, number, accepted_at").eq("id", id).maybeSingle();
    if (!current) return { error: "Dokument nicht gefunden." };
    if (current.kind === "rechnung" && current.number) {
      return { error: "Festgeschriebene Rechnungen können nicht mehr geändert werden (GoBD). Bitte stornieren und neu erstellen." };
    }
    if (current.kind === "angebot" && current.accepted_at) return { error: "Angenommene Angebote können nicht mehr geändert werden. Bitte duplizieren." };
    const customerId = await ensureCustomer(data, admin.email);
    const { error } = await client
      .from("documents")
      .update({ ...data, kind: current.kind, customer_id: customerId, items: cleanItems, net_total: t.net, vat_total: t.vat, gross_total: t.gross })
      .eq("id", id);
    if (error) return { error: "Speichern fehlgeschlagen." };
    await logDocumentEvent(id, "bearbeitet", null, admin.email);
    paths(current.kind as DocumentKind, id);
    return { ok: "Gespeichert." };
  }

  const customerId = await ensureCustomer(data, admin.email);
  const { data: created, error } = await client
    .from("documents")
    .insert({ ...data, customer_id: customerId, items: cleanItems, net_total: t.net, vat_total: t.vat, gross_total: t.gross, created_by: admin.email })
    .select("id, number")
    .single();
  if (error || !created) return { error: "Dokument konnte nicht angelegt werden." };
  await bumpServiceUsage(cleanItems);
  if (data.inquiry_id) await client.from("inquiries").update({ status: "in_bearbeitung", customer_id: customerId }).eq("id", data.inquiry_id).eq("status", "neu");
  await logDocumentEvent(created.id, "erstellt", null, admin.email);
  await logActivity(admin.email, "erstellt", data.kind, created.id, `${kindLabels[data.kind].one} ${created.number ?? "(Entwurf)"} für ${data.customer_name}`);
  paths(data.kind, created.id);
  redirect(`/admin/${kindLabels[data.kind].path}/${created.id}?neu=1`);
}

export async function setDocumentStatus(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: doc } = await db().from("documents").select("kind, status, number").eq("id", id.data).maybeSingle();
  if (!doc) return;
  const status = fd.get("status");
  if (!isStatusFor(doc.kind, status)) return;
  if (doc.kind === "rechnung" && (status === "entwurf" || !doc.number)) return; // Rechnungen nur über Festschreiben
  const patch: Record<string, unknown> = { status };
  if (status === "abgelehnt") patch.declined_at = new Date().toISOString();
  await db().from("documents").update(patch).eq("id", id.data);
  await logDocumentEvent(id.data, "status", `Status → ${status}`, admin.email);
  paths(doc.kind, id.data);
}

export async function finalizeInvoice(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: number } = await db().rpc("finalize_invoice", { p_id: id.data });
  if (number) {
    await logDocumentEvent(id.data, "festgeschrieben", `Rechnungsnummer ${number}`, admin.email);
    await logActivity(admin.email, "festgeschrieben", "rechnung", id.data, `Rechnung ${number} festgeschrieben`);
    const { data: doc } = await db().from("documents").select("customer_id").eq("id", id.data).maybeSingle();
    if (doc?.customer_id) await db().from("customers").update({ status: "kunde" }).eq("id", doc.customer_id).eq("status", "lead");
  }
  paths("rechnung", id.data);
}

export async function recordPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Ungültige Rechnung." };
  const amount = parseDecimal(str(fd, "amount"));
  const date = str(fd, "date") || todayBerlin();
  if (amount === null || amount <= 0) return { error: "Bitte einen gültigen Betrag eingeben." };
  const doc = await getDocument(id.data);
  if (!doc || doc.kind !== "rechnung" || !doc.number) return { error: "Nur festgeschriebene Rechnungen können bezahlt werden." };
  if (doc.status === "storniert") return { error: "Die Rechnung ist storniert." };
  const paid = Math.round((doc.paid_amount + amount) * 100) / 100;
  const full = paid + 0.004 >= doc.gross_total;
  await db()
    .from("documents")
    .update({ paid_amount: paid, status: full ? "bezahlt" : "teilbezahlt", paid_at: full ? `${date}T12:00:00Z` : null })
    .eq("id", doc.id);
  await logDocumentEvent(doc.id, "zahlung", `${formatEuro(amount)} am ${formatDateDE(date)}`, admin.email);
  await logActivity(admin.email, "zahlung", "rechnung", doc.id, `Zahlung ${formatEuro(amount)} zu ${doc.number}`);
  paths("rechnung", doc.id);
  return { ok: full ? "Rechnung als bezahlt markiert." : `Teilzahlung erfasst – offen: ${formatEuro(doc.gross_total - paid)}.` };
}

export async function cancelInvoice(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const doc = await getDocument(id.data);
  if (!doc || doc.kind !== "rechnung" || !doc.number) return;
  await db().from("documents").update({ status: "storniert" }).eq("id", doc.id);
  await logDocumentEvent(doc.id, "storniert", null, admin.email);
  await logActivity(admin.email, "storniert", "rechnung", doc.id, `Rechnung ${doc.number} storniert`);
  paths("rechnung", doc.id);
}

/** Kopie als neuer Entwurf – optional als anderer Typ (Angebot → Rechnung) */
async function copyDocument(id: string, kind: DocumentKind, actor: string) {
  const src = await getDocument(id);
  if (!src) return null;
  const settings = await getSettings();
  const today = todayBerlin();
  const asInvoice = kind === "rechnung";
  const texts = asInvoice ? settings.invoices : settings.offers;
  const changedKind = src.kind !== kind;
  const { data: created } = await db()
    .from("documents")
    .insert({
      kind,
      customer_id: src.customer_id,
      inquiry_id: src.inquiry_id,
      source_document_id: changedKind ? src.id : null,
      title: changedKind ? src.title.replace(/^Angebot/i, "Rechnung") : src.title,
      customer_salutation: src.customer_salutation,
      customer_name: src.customer_name,
      company_name: src.company_name,
      street: src.street,
      postal_code: src.postal_code,
      city: src.city,
      country: src.country,
      email: src.email,
      phone: src.phone,
      customer_vat_id: src.customer_vat_id,
      doc_date: today,
      valid_until: asInvoice ? null : addDays(today, settings.offers.validityDays),
      due_date: asInvoice ? addDays(today, settings.invoices.dueDays) : null,
      service_period: asInvoice ? src.service_period ?? formatDateDE(today) : null,
      reference: changedKind && src.number ? `Gemäß unserem Angebot ${src.number} vom ${formatDateDE(src.doc_date)}` : src.reference,
      intro: changedKind ? `${greetingLine(src.customer_salutation, src.customer_name)}\n\n${texts.intro}` : src.intro,
      items: src.items,
      discount_percent: src.discount_percent,
      notes: changedKind ? texts.notes || null : src.notes,
      payment_terms: changedKind ? texts.paymentTerms || null : src.payment_terms,
      closing: changedKind ? texts.closing || null : src.closing,
      net_total: src.net_total,
      vat_total: src.vat_total,
      gross_total: src.gross_total,
      created_by: actor,
    })
    .select("id")
    .single();
  return created ? { id: created.id as string, src } : null;
}

export async function duplicateDocument(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: doc } = await db().from("documents").select("kind").eq("id", id.data).maybeSingle();
  if (!doc) return;
  const res = await copyDocument(id.data, doc.kind, admin.email);
  if (!res) return;
  await logDocumentEvent(res.id, "erstellt", `Kopie von ${res.src.number ?? "Entwurf"}`, admin.email);
  paths(doc.kind);
  redirect(`/admin/${kindLabels[doc.kind as DocumentKind].path}/${res.id}`);
}

export async function convertToInvoice(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const res = await copyDocument(id.data, "rechnung", admin.email);
  if (!res) return;
  await logDocumentEvent(res.id, "erstellt", `Aus Angebot ${res.src.number}`, admin.email);
  await logDocumentEvent(res.src.id, "rechnung", "Rechnung erstellt", admin.email);
  await logActivity(admin.email, "umgewandelt", "angebot", res.src.id, `Angebot ${res.src.number} → Rechnung`);
  paths("rechnung");
  redirect(`/admin/rechnungen/${res.id}?neu=1`);
}

export async function deleteDocument(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: doc } = await db().from("documents").select("kind, number, customer_name").eq("id", id.data).maybeSingle();
  if (!doc) return;
  // Festgeschriebene Rechnungen dürfen nicht gelöscht werden (Aufbewahrungspflicht)
  if (doc.kind === "rechnung" && doc.number) return;
  await db().from("documents").delete().eq("id", id.data);
  await logActivity(admin.email, "gelöscht", doc.kind, id.data, `${kindLabels[doc.kind as DocumentKind].one} ${doc.number ?? "(Entwurf)"} – ${doc.customer_name}`);
  paths(doc.kind);
  redirect(`/admin/${kindLabels[doc.kind as DocumentKind].path}`);
}

export async function setSharing(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const action = fd.get("action");
  const patch =
    action === "renew"
      ? { share_token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""), share_enabled: true }
      : { share_enabled: action === "enable" };
  const { data } = await db().from("documents").update(patch).eq("id", id.data).select("kind").maybeSingle();
  await logDocumentEvent(id.data, "link", action === "renew" ? "Neuer Link" : action === "enable" ? "Link aktiviert" : "Link deaktiviert", admin.email);
  if (data) paths(data.kind, id.data);
}

/* ------------------------ Per E-Mail senden (PDF im Anhang) ------------------------ */

const sendSchema = z.object({
  id: uuid,
  to: z.email({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }).max(254),
  message: z.string().trim().max(3000),
  copy: z.boolean(),
});

export async function sendDocumentEmail(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = sendSchema.safeParse({
    id: fd.get("id"),
    to: String(fd.get("to") ?? "").trim().toLowerCase(),
    message: String(fd.get("message") ?? ""),
    copy: fd.get("copy") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const { id, to, message, copy } = parsed.data;
  if (!(await rateLimit(`doc-send:${id}`, 8, 3600))) return { error: "Dieses Dokument wurde gerade mehrfach gesendet. Bitte später erneut versuchen." };

  let doc = await getDocument(id);
  if (!doc) return { error: "Dokument nicht gefunden." };
  if (!doc.items.length) return { error: "Das Dokument enthält noch keine Positionen." };
  if (doc.kind === "angebot" && doc.status === "abgelehnt") return { error: "Abgelehnte Angebote können nicht gesendet werden." };
  if (doc.kind === "rechnung" && doc.status === "storniert") return { error: "Stornierte Rechnungen können nicht gesendet werden." };

  const client = db();
  // Rechnungen werden beim ersten Versand automatisch festgeschrieben
  if (doc.kind === "rechnung" && !doc.number) {
    const { error } = await client.rpc("finalize_invoice", { p_id: id });
    if (error) return { error: "Die Rechnung konnte nicht festgeschrieben werden." };
    await logDocumentEvent(id, "festgeschrieben", null, admin.email);
    doc = (await getDocument(id))!;
  }
  if (!doc.share_enabled) {
    await client.from("documents").update({ share_enabled: true }).eq("id", id);
    doc.share_enabled = true;
  }

  const settings = await getSettings();
  let pdf: Buffer;
  try {
    pdf = await renderDocumentPdf(doc, settings);
  } catch (error) {
    console.error("[pdf]", error);
    return { error: "Das PDF konnte nicht erzeugt werden. Bitte erneut versuchen." };
  }

  const content = documentEmail({
    siteUrl: env.siteUrl,
    company: mailCompany(settings),
    kind: doc.kind,
    greeting: greetingLine(doc.customer_salutation, doc.customer_name),
    message: message || null,
    number: doc.number ?? "",
    title: doc.title,
    date: formatDateDE(doc.doc_date),
    validUntil: doc.kind === "angebot" && doc.valid_until ? formatDateDE(doc.valid_until) : null,
    dueDate: doc.kind === "rechnung" && doc.due_date ? formatDateDE(doc.due_date) : null,
    gross: formatEuro(doc.gross_total),
    onlineUrl: `${env.siteUrl}/dokument/${doc.share_token}`,
    signature: settings.company.owner || settings.company.name,
    attachment: { filename: documentFilename(doc), content: pdf, contentType: "application/pdf" },
  });

  const inbox = settings.notifications.inbox || settings.company.email;
  const res = await sendMail(to, content, { replyTo: inbox, bcc: copy ? inbox : null, kind: doc.kind, relatedId: id });
  if (!res.ok) {
    console.error("[versand]", doc.number, res.error);
    return { error: `Die E-Mail konnte nicht gesendet werden: ${res.error}` };
  }

  await client
    .from("documents")
    .update({
      last_sent_at: new Date().toISOString(),
      last_sent_to: to,
      send_count: doc.send_count + 1,
      ...(doc.kind === "angebot" && doc.status === "entwurf" ? { status: "versendet" } : {}),
      ...(!doc.email ? { email: to } : {}),
    })
    .eq("id", id);
  if (doc.customer_id) await client.from("customers").update({ last_contact_at: new Date().toISOString() }).eq("id", doc.customer_id);
  await logDocumentEvent(id, "gesendet", `an ${to}${copy ? " (Kopie an Postfach)" : ""}`, admin.email);
  await logActivity(admin.email, "gesendet", doc.kind, id, `${kindLabels[doc.kind].one} ${doc.number} an ${to}`);
  paths(doc.kind, id);
  return { ok: `${kindLabels[doc.kind].one} an ${to} gesendet${copy ? " (Kopie an Ihr Postfach)" : ""}.` };
}

/* ------------------------ Öffentlich: Annahme / Ablehnung durch Kunden ------------------------ */

export async function respondToOffer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  const decision = str(fd, "decision");
  const name = str(fd, "name");
  if (!isToken(token)) return { error: "Ungültiger Link." };
  const ip = await clientIpHash();
  if (!(await rateLimit(`offer-respond:${ip}`, 10, 3600))) return { error: "Zu viele Versuche. Bitte später erneut versuchen." };

  const client = db();
  const { data: row } = await client.from("documents").select("*").eq("share_token", token).eq("share_enabled", true).eq("kind", "angebot").maybeSingle();
  if (!row) return { error: "Dieses Angebot ist nicht mehr verfügbar." };
  const offer = normalizeDoc(row);
  if (offer.accepted_at) return { ok: "Dieses Angebot wurde bereits angenommen. Vielen Dank!" };
  if (offer.status === "abgelehnt") return { error: "Dieses Angebot ist nicht mehr gültig. Bitte kontaktieren Sie uns." };
  if (offer.valid_until && offer.valid_until < todayBerlin()) {
    return { error: "Die Gültigkeit dieses Angebots ist abgelaufen. Gerne erstellen wir Ihnen ein aktuelles Angebot." };
  }

  if (decision === "decline") {
    const reason = str(fd, "reason").slice(0, 1000) || null;
    await client.from("documents").update({ status: "abgelehnt", declined_at: new Date().toISOString(), decline_reason: reason }).eq("id", offer.id);
    await logDocumentEvent(offer.id, "abgelehnt", reason ? `Kunde: ${reason}` : "vom Kunden online abgelehnt", "Kunde");
    revalidatePath(`/dokument/${token}`);
    paths("angebot", offer.id);
    return { ok: "Danke für Ihre Rückmeldung. Wir haben Ihre Entscheidung gespeichert." };
  }

  if (name.length < 2 || name.length > 160) return { error: "Bitte geben Sie Ihren vollständigen Namen ein." };
  if (fd.get("confirm") !== "on") return { error: "Bitte bestätigen Sie die Annahme des Angebots." };
  const { error } = await client
    .from("documents")
    .update({ status: "angenommen", accepted_at: new Date().toISOString(), accepted_name: name, accepted_ip_hash: ip })
    .eq("id", offer.id)
    .is("accepted_at", null);
  if (error) return { error: "Die Annahme konnte nicht gespeichert werden. Bitte rufen Sie uns an." };
  await logDocumentEvent(offer.id, "angenommen", `online von ${name}`, "Kunde");
  await logActivity("Kunde", "angenommen", "angebot", offer.id, `Angebot ${offer.number} angenommen von ${name}`);
  if (offer.customer_id) await client.from("customers").update({ status: "kunde" }).eq("id", offer.customer_id).eq("status", "lead");
  revalidatePath(`/dokument/${token}`);
  paths("angebot", offer.id);

  after(async () => {
    const settings = await getSettings();
    if (!settings.notifications.notifyOnAcceptance) return;
    await sendMail(
      settings.notifications.inbox || settings.company.email,
      offerAcceptedEmail({
        siteUrl: env.siteUrl,
        company: mailCompany(settings),
        number: offer.number ?? "",
        customer: offer.company_name || offer.customer_name,
        gross: formatEuro(offer.gross_total),
        acceptedBy: name,
        adminUrl: `${env.siteUrl}/admin/angebote/${offer.id}`,
      }),
      { kind: "benachrichtigung", relatedId: offer.id },
    );
  });
  return { ok: "Vielen Dank! Ihr Auftrag ist bei uns eingegangen. Wir melden uns in Kürze zur Abstimmung der nächsten Schritte." };
}
