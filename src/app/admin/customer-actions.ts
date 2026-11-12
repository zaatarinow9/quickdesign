"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin, assertFullAccess } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";
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
    const { error } = await client.from("customers").update(parsed.data).eq("id", id);
    if (error) return { error: "Speichern fehlgeschlagen." };
    revalidatePath(`/admin/kunden/${id}`);
    revalidatePath("/admin/kunden");
    return { ok: "Kunde gespeichert." };
  }
  const { data, error } = await client.from("customers").insert({ ...parsed.data, source: "manuell", created_by: admin.email }).select("id, customer_number").single();
  if (error || !data) return { error: "Kunde konnte nicht angelegt werden." };
  await logActivity(admin.email, "erstellt", "kunde", data.id, `Kunde ${data.customer_number} – ${parsed.data.company_name || parsed.data.name}`);
  revalidatePath("/admin/kunden");
  redirect(`/admin/kunden/${data.id}`);
}

export async function deleteCustomer(fd: FormData) {
  const admin = await assertFullAccess();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const client = db();
  const { count } = await client.from("documents").select("id", { count: "exact", head: true }).eq("customer_id", id.data).eq("kind", "rechnung").not("number", "is", null);
  // Kunden mit Rechnungen: Stammdaten bleiben auf den Rechnungen erhalten (Kopie), der Datensatz wird gelöscht.
  const { data } = await client.from("customers").delete().eq("id", id.data).select("customer_number, name").maybeSingle();
  await logActivity(admin.email, "gelöscht", "kunde", id.data, `Kunde ${data?.customer_number ?? ""} gelöscht${count ? ` (${count} Rechnungen bleiben archiviert)` : ""} – DSGVO`);
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
  const { data } = await db().from("inquiries").delete().eq("id", id.data).select("reference").maybeSingle();
  await logActivity(admin.email, "gelöscht", "anfrage", id.data, `Anfrage ${data?.reference ?? ""} gelöscht`);
  revalidatePath("/admin/anfragen");
  redirect("/admin/anfragen");
}
