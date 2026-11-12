"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin, assertFullAccess } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings/server";
import { mailCompany } from "@/lib/admin/company";
import { logActivity } from "@/lib/admin/log";
import { sendMail } from "@/lib/email/send";
import { campaignEmail } from "@/lib/email/templates";
import { greetingLine } from "@/lib/documents/format";
import type { ActionState } from "./document-actions";

const schema = z.object({
  name: z.string().trim().min(1, { error: "Bitte einen Namen angeben." }).max(160),
  subject: z.string().trim().min(3, { error: "Bitte einen Betreff angeben." }).max(200),
  body: z.string().trim().min(10, { error: "Bitte einen Text eingeben." }).max(20000),
  audience_tag: z.string().trim().max(60).nullable(),
});

export async function saveCampaign(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = schema.safeParse({
    name: fd.get("name"),
    subject: fd.get("subject"),
    body: fd.get("body"),
    audience_tag: String(fd.get("audience_tag") ?? "").trim() || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const id = String(fd.get("id") ?? "");
  if (id) {
    const { data: c } = await db().from("campaigns").select("status").eq("id", id).maybeSingle();
    if (!c || c.status !== "entwurf") return { error: "Gesendete Kampagnen können nicht geändert werden." };
    await db().from("campaigns").update(parsed.data).eq("id", id);
    revalidatePath(`/admin/marketing/kampagnen/${id}`);
    return { ok: "Gespeichert." };
  }
  const { data } = await db().from("campaigns").insert({ ...parsed.data, created_by: admin.email }).select("id").single();
  if (!data) return { error: "Kampagne konnte nicht angelegt werden." };
  revalidatePath("/admin/marketing/kampagnen");
  redirect(`/admin/marketing/kampagnen/${data.id}`);
}

/** Testversand an die eigene Adresse */
export async function sendCampaignTest(fd: FormData) {
  const admin = await assertAdmin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: c } = await db().from("campaigns").select("*").eq("id", id.data).maybeSingle();
  if (!c) return;
  const settings = await getSettings();
  await sendMail(
    admin.email,
    campaignEmail({
      siteUrl: env.siteUrl,
      company: mailCompany(settings),
      subject: `[TEST] ${c.subject}`,
      greeting: greetingLine(null, admin.name ?? ""),
      body: c.body,
      unsubscribeUrl: `${env.siteUrl}/abmelden/test`,
      oneClickUrl: `${env.siteUrl}/api/abmelden?t=test`,
    }),
    { kind: "kampagne_test", relatedId: c.id },
  );
  await logActivity(admin.email, "test", "kampagne", c.id, `Testversand „${c.name}“ an ${admin.email}`);
}

/**
 * Versand in Etappen (max. 25 E-Mails pro Klick/Aufruf), ausschließlich an Kontakte mit
 * bestätigter Einwilligung (Double-Opt-in). Jede E-Mail enthält einen Abmeldelink.
 */
export async function sendCampaignBatch(fd: FormData) {
  const admin = await assertFullAccess();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const client = db();
  const { data: c } = await client.from("campaigns").select("*").eq("id", id.data).maybeSingle();
  if (!c || c.status === "gesendet") return;

  if (c.status === "entwurf") {
    // Empfängerliste einfrieren
    let q = client.from("customers").select("id").eq("marketing_status", "bestaetigt").not("email", "is", null);
    if (c.audience_tag) q = q.contains("tags", [c.audience_tag]);
    const { data: recipients } = await q.limit(20000);
    const rows = (recipients ?? []).map((r) => ({ campaign_id: c.id, customer_id: r.id }));
    for (let i = 0; i < rows.length; i += 500) await client.from("campaign_recipients").upsert(rows.slice(i, i + 500), { onConflict: "campaign_id,customer_id" });
    await client.from("campaigns").update({ status: "wird_gesendet", started_at: new Date().toISOString(), recipients_total: rows.length }).eq("id", c.id);
    await logActivity(admin.email, "kampagne", "kampagne", c.id, `Kampagne „${c.name}“ gestartet (${rows.length} Empfänger)`);
  }

  const { data: batch } = await client
    .from("campaign_recipients")
    .select("customer_id, customers(id, email, name, salutation, marketing_status, unsubscribe_token)")
    .eq("campaign_id", c.id)
    .eq("status", "ausstehend")
    .limit(25);
  const settings = await getSettings();
  let sent = 0;
  let failed = 0;
  for (const r of batch ?? []) {
    const cust = (Array.isArray(r.customers) ? r.customers[0] : r.customers) as { email: string | null; name: string; salutation: string | null; marketing_status: string; unsubscribe_token: string } | null;
    // Einwilligung zwischenzeitlich widerrufen? → nicht senden
    if (!cust?.email || cust.marketing_status !== "bestaetigt") {
      await client.from("campaign_recipients").update({ status: "fehler", error: "keine gültige Einwilligung" }).eq("campaign_id", c.id).eq("customer_id", r.customer_id);
      failed++;
      continue;
    }
    const res = await sendMail(
      cust.email,
      campaignEmail({
        siteUrl: env.siteUrl,
        company: mailCompany(settings),
        subject: c.subject,
        greeting: greetingLine(cust.salutation, cust.name),
        body: c.body,
        unsubscribeUrl: `${env.siteUrl}/abmelden/${cust.unsubscribe_token}`,
        oneClickUrl: `${env.siteUrl}/api/abmelden?t=${cust.unsubscribe_token}`,
      }),
      { kind: "kampagne", relatedId: c.id },
    );
    await client
      .from("campaign_recipients")
      .update(res.ok ? { status: "gesendet", sent_at: new Date().toISOString() } : { status: "fehler", error: res.error.slice(0, 300) })
      .eq("campaign_id", c.id)
      .eq("customer_id", r.customer_id);
    if (res.ok) sent++;
    else failed++;
  }
  const { count: remaining } = await client.from("campaign_recipients").select("customer_id", { count: "exact", head: true }).eq("campaign_id", c.id).eq("status", "ausstehend");
  await client
    .from("campaigns")
    .update({
      sent_count: Number(c.sent_count) + sent,
      failed_count: Number(c.failed_count) + failed,
      ...(remaining === 0 ? { status: "gesendet", finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", c.id);
  revalidatePath(`/admin/marketing/kampagnen/${c.id}`);
  revalidatePath("/admin/marketing/kampagnen");
}

export async function deleteCampaign(fd: FormData) {
  await assertFullAccess();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  await db().from("campaigns").delete().eq("id", id.data).eq("status", "entwurf");
  revalidatePath("/admin/marketing/kampagnen");
  redirect("/admin/marketing/kampagnen");
}
