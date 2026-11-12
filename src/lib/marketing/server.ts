import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { clientIpHash, userAgent } from "@/lib/security";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings/server";
import { mailCompany } from "@/lib/admin/company";
import { sendMail } from "@/lib/email/send";
import { doubleOptInEmail } from "@/lib/email/templates";
import { MARKETING_CONSENT_TEXT, MARKETING_CONSENT_VERSION } from "./consent-text";

type ConsentMeta = { source: string; ipHash?: string | null; userAgent?: string | null; actor?: string | null };

export async function logConsent(customerId: string, email: string | null, action: string, meta: ConsentMeta) {
  await db().from("consent_events").insert({
    customer_id: customerId,
    email,
    action,
    source: meta.source,
    consent_text: action === "angefragt" || action === "manuell_erfasst" ? MARKETING_CONSENT_TEXT : null,
    text_version: MARKETING_CONSENT_VERSION,
    ip_hash: meta.ipHash ?? null,
    user_agent: meta.userAgent ?? null,
    actor: meta.actor ?? null,
  });
}

/** Startet das Double-Opt-in: Werbung erst nach Klick auf den Bestätigungslink (UWG § 7 Abs. 2 Nr. 2). */
export async function startDoubleOptIn(customer: { id: string; email: string; name: string; marketing_status?: string | null }, meta: ConsentMeta) {
  if (customer.marketing_status === "bestaetigt") return { ok: true as const, already: true };
  const token = randomBytes(32).toString("hex");
  await db()
    .from("customers")
    .update({ marketing_status: "ausstehend", marketing_consent_at: new Date().toISOString(), doi_token: token, doi_sent_at: new Date().toISOString(), marketing_revoked_at: null })
    .eq("id", customer.id);
  await logConsent(customer.id, customer.email, "angefragt", meta);
  const settings = await getSettings();
  const res = await sendMail(
    customer.email,
    doubleOptInEmail({ siteUrl: env.siteUrl, company: mailCompany(settings), name: customer.name, confirmUrl: `${env.siteUrl}/einwilligung/${token}` }),
    { kind: "double_opt_in", relatedId: customer.id },
  );
  return { ok: res.ok, already: false };
}

/** Widerruf über den persönlichen Abmeldelink */
export async function unsubscribeByToken(token: string, source: string) {
  const { data: c } = await db().from("customers").select("id, email, marketing_status").eq("unsubscribe_token", token).maybeSingle();
  if (!c) return false;
  if (c.marketing_status !== "abgemeldet") {
    await db().from("customers").update({ marketing_status: "abgemeldet", marketing_revoked_at: new Date().toISOString(), doi_token: null }).eq("id", c.id);
    await logConsent(c.id, c.email, "widerrufen", { source, ipHash: await clientIpHash(), userAgent: await userAgent() });
  }
  return true;
}
