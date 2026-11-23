"use server";

import { trashCustomer, trashInquiry } from "@/lib/admin/delete";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin, assertFullAccess } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";
import { ensureCustomerFolder, syncCustomerFolderName } from "@/lib/customers/folder";
import { logConsent, startDoubleOptIn } from "@/lib/marketing/server";
import type { ActionState } from "./document-actions";

const opt = (max: number) => z.string().trim().max(max).nullable();

const customerSchema = z.object({
  kind: z.enum(["privat", "firma"]),
  status: z.enum(["lead", "kunde", "inaktiv"]),
  salutation: z.enum(["Herr", "Frau", "Divers", ""]).transform((v) => v || null),
  name: z.string().trim().min(1, { error: "Bitte einen Namen angeben." }).max(160),
  company_name: opt(160),
  email: z.email({ error: "Ungültige E-Mail-Adresse." }).max(254).nullable(),
  phone: opt(60),
  street: opt(160),
  postal_code: opt(12),
  city: opt(80),
  country: z.string().trim().min(1).max(60),
  vat_id: opt(40),
  website: opt(200),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  notes: opt(10000),
});

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const o = (fd: FormData, k: string) => s(fd, k) || null;

export async function saveCustomer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const id = s(fd, "id");
  const parsed = customerSchema.safeParse({
    kind: s(fd, "kind") || "privat",
    status: s(fd, "status") || "lead",
    salutation: s(fd, "salutation"),
    name: s(fd, "name"),
    company_name: o(fd, "company_name"),
    email: o(fd, "email")?.toLowerCase() ?? null,
    phone: o(fd, "phone"),
    street: o(fd, "street"),
    postal_code: o(fd, "postal_code"),
    city: o(fd, "city"),
    country: s(fd, "country") || "Deutschland",
    vat_id: o(fd, "vat_id"),
    website: o(fd, "website"),
    birthday: o(fd, "birthday"),
    tags: s(fd, "tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    notes: o(fd, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const client = db();
  if (parsed.data.email) {
    const { data: dupe } = await client.from("customers").select("id, customer_number").eq("email", parsed.data.email).maybeSingle();
    if (dupe && dupe.id !== id) return { error: `Diese E-Mail-Adresse gehört bereits zu Kunde ${dupe.customer_number}.` };
  }
  if (id) {
    if (!z.uuid().safeParse(id).success) return { error: "Ungültiger Kunde." };
    const { data: saved, error } = await client.from("customers").update(parsed.data).eq("id", id).select("id, name, company_name, customer_number, folder_path").maybeSingle();
    if (error || !saved) return { error: "Speichern fehlgeschlagen." };
    await syncCustomerFolderName(saved);
    // neue Kategorien automatisch in die Liste aufnehmen
    if (parsed.data.tags.length) await client.from("customer_categories").upsert(parsed.data.tags.map((name) => ({ name, sort: 100 })), { onConflict: "name", ignoreDuplicates: true });
    revalidatePath(`/admin/kunden/${id}`);
    revalidatePath("/admin/kunden");
    return { ok: "Kunde gespeichert." };
  }
  const { data, error } = await client.from("customers").insert({ ...parsed.data, source: "manuell", created_by: admin.email }).select("id, customer_number, name, company_name").single();
  if (error || !data) return { error: "Kunde konnte nicht angelegt werden." };
  await ensureCustomerFolder(data);
  if (parsed.data.tags.length) await client.from("customer_categories").upsert(parsed.data.tags.map((name) => ({ name, sort: 100 })), { onConflict: "name", ignoreDuplicates: true });
  await logActivity(admin.email, "erstellt", "kunde", data.id, `Kunde ${data.customer_number} – ${parsed.data.company_name || parsed.data.name}`);
  revalidatePath("/admin/kunden");
  redirect(`/admin/kunden/${data.id}`);
}

export async function deleteCustomer(fd: FormData) {
  const admin = await assertFullAccess();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  // Rechnungen behalten ihre Kopie der Stammdaten; der Kunde landet 30 Tage im Papierkorb
  const r = await trashCustomer(id.data, admin.name || admin.email, fd.get("withFiles") === "1");
  await logActivity(admin.email, "gelöscht", "kunde", id.data, `Kunde ${r?.label ?? ""} in den Papierkorb`);
  revalidatePath("/admin/kunden");
  redirect("/admin/kunden");
}

/** Werbe-Einwilligung verwalten (nur mit Nachweis) */
export async function marketingAction(fd: FormData) {
  const admin = await assertAdmin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const action = s(fd, "action");
  const client = db();
  const { data: c } = await client.from("customers").select("id, email, name, marketing_status").eq("id", id.data).maybeSingle();
  if (!c?.email) return;
  if (action === "doi") {
    await startDoubleOptIn({ id: c.id, email: c.email, name: c.name, marketing_status: c.marketing_status }, { source: "verwaltung", actor: admin.email });
  } else if (action === "revoke") {
    await client.from("customers").update({ marketing_status: "abgemeldet", marketing_revoked_at: new Date().toISOString(), doi_token: null }).eq("id", c.id);
    await logConsent(c.id, c.email, "widerrufen", { source: "verwaltung", actor: admin.email });
  } else if (action === "manual") {
    // Schriftliche/sonstige nachweisbare Einwilligung (z. B. unterschriebenes Formular) – Nachweis muss vorliegen
    const proof = s(fd, "proof").slice(0, 80);
    if (!proof) return;
    await client.from("customers").update({ marketing_status: "bestaetigt", marketing_consent_at: new Date().toISOString(), marketing_confirmed_at: new Date().toISOString(), marketing_revoked_at: null }).eq("id", c.id);
    await logConsent(c.id, c.email, "manuell_erfasst", { source: `nachweis: ${proof}`, actor: admin.email });
  }
  await logActivity(admin.email, "einwilligung", "kunde", c.id, `Werbe-Einwilligung ${c.email}: ${action}`);
  revalidatePath(`/admin/kunden/${c.id}`);
  revalidatePath("/admin/marketing");
}

/* ------------------------------ Anfragen ------------------------------ */

export async function updateInquiry(fd: FormData) {
  const admin = await assertAdmin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const patch: Record<string, unknown> = {};
  const status = s(fd, "status");
  if (["neu", "in_bearbeitung", "erledigt", "archiviert"].includes(status)) patch.status = status;
  if (fd.has("internal_notes")) patch.internal_notes = s(fd, "internal_notes").slice(0, 6000) || null;
  await db().from("inquiries").update(patch).eq("id", id.data);
  if (patch.status) await logActivity(admin.email, "anfrage", "anfrage", id.data, `Anfrage → ${status}`);
  revalidatePath(`/admin/anfragen/${id.data}`);
  revalidatePath("/admin/anfragen");
  revalidatePath("/admin");
}

export async function deleteInquiry(fd: FormData) {
  const admin = await assertFullAccess();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const r = await trashInquiry(id.data, admin.name || admin.email);
  await logActivity(admin.email, "gelöscht", "anfrage", id.data, `Anfrage ${r?.label ?? ""} in den Papierkorb`);
  revalidatePath("/admin/anfragen");
  redirect("/admin/anfragen");
}

/* ------------------------------ Kategorien ------------------------------ */

export async function saveCategory(input: { name: string; color: string; previous?: string }): Promise<{ ok?: string; error?: string }> {
  await assertAdmin();
  const name = String(input.name ?? "").trim().slice(0, 40);
  const color = /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : "#64748b";
  if (!name) return { error: "Bitte einen Namen angeben." };
  const client = db();
  const prev = input.previous?.trim();
  if (prev && prev !== name) {
    // umbenennen: Kategorie + alle Kunden mit dieser Kategorie
    await client.from("customer_categories").upsert({ name, color }, { onConflict: "name" });
    const { data: list } = await client.from("customers").select("id, tags").contains("tags", [prev]).limit(5000);
    for (const c of list ?? []) {
      const tags = [...new Set(((c.tags as string[]) ?? []).map((t) => (t === prev ? name : t)))];
      await client.from("customers").update({ tags }).eq("id", c.id);
    }
    await client.from("customer_categories").delete().eq("name", prev);
  } else {
    await client.from("customer_categories").upsert({ name, color }, { onConflict: "name" });
  }
  revalidatePath("/admin", "layout");
  return { ok: "Gespeichert." };
}

export async function deleteCategory(name: string): Promise<{ ok?: string; error?: string }> {
  await assertAdmin();
  const client = db();
  const { data: list } = await client.from("customers").select("id, tags").contains("tags", [name]).limit(5000);
  for (const c of list ?? []) await client.from("customers").update({ tags: ((c.tags as string[]) ?? []).filter((t) => t !== name) }).eq("id", c.id);
  await client.from("customer_categories").delete().eq("name", name);
  revalidatePath("/admin", "layout");
  return { ok: `Kategorie „${name}“ entfernt.` };
}

/** Kategorien eines Kunden direkt umschalten (Chips) */
export async function setCustomerTags(id: string, tags: string[]): Promise<{ ok?: string; error?: string }> {
  await assertAdmin();
  if (!z.uuid().safeParse(id).success) return { error: "Ungültig." };
  const clean = [...new Set(tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
  await db().from("customers").update({ tags: clean }).eq("id", id);
  revalidatePath(`/admin/kunden/${id}`);
  revalidatePath("/admin/kunden");
  return { ok: "Gespeichert." };
}
