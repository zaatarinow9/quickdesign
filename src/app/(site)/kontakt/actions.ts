"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { normalizeEmailAddress } from "@/lib/email/address";
import { sendSmtpMail } from "@/lib/email/smtp";
import { env, getContactRecipient, isSmtpConfigured } from "@/lib/env";
import { services } from "@/content/services";
import { site } from "@/content/site";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "message" | "consent", string>>;
};

const MIN_FILL_TIME_MS = 2500;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };
const submissions = new Map<string, number[]>();

function isRateLimitedLocal(key: string): boolean {
  const now = Date.now();
  const recent = (submissions.get(key) ?? []).filter((time) => now - time < RATE_LIMIT.windowMs);
  recent.push(now);
  submissions.set(key, recent);
  return recent.length > RATE_LIMIT.max;
}

function read(formData: FormData, key: string, max = 2000): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readAttribution(formData: FormData): Record<string, string> {
  try {
    const raw = JSON.parse(read(formData, "attribution", 2000) || "{}") as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "referrer", "landing"]) {
      if (typeof raw[k] === "string" && raw[k]) out[k] = (raw[k] as string).slice(0, 200);
    }
    return out;
  } catch {
    return {};
  }
}

const SUCCESS = "Vielen Dank! Ihre Nachricht ist bei uns eingegangen. Wir melden uns so schnell wie möglich.";

export async function sendContactRequest(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  // Spam-Fallen: Honeypot und unrealistisch schnelles Absenden → neutrale Erfolgsmeldung
  const startedAt = Number(read(formData, "startedAt", 20));
  if (read(formData, "website") || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_TIME_MS) {
    return { status: "success", message: SUCCESS };
  }

  const name = read(formData, "name", 120);
  const company = read(formData, "company", 160);
  const email = normalizeEmailAddress(read(formData, "email", 200));
  const phone = read(formData, "phone", 60);
  const message = read(formData, "message", 5000);
  const consent = formData.get("consent") === "on";
  const marketing = formData.get("marketing") === "on";
  const validSlugs = new Set(services.map((service) => service.slug));
  const interests = formData
    .getAll("interest")
    .filter((value): value is string => typeof value === "string" && validSlugs.has(value))
    .map((slug) => services.find((service) => service.slug === slug)?.title ?? slug);

  const fieldErrors: ContactFormState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = "Bitte geben Sie Ihren Namen an.";
  if (!email) fieldErrors.email = "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  if (message.length < 10) fieldErrors.message = "Bitte beschreiben Sie Ihr Anliegen in ein paar Worten.";
  if (!consent) fieldErrors.consent = "Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.";
  if (Object.keys(fieldErrors).length > 0 || !email) {
    return { status: "error", message: "Bitte prüfen Sie die markierten Felder.", fieldErrors };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimitedLocal(ip)) {
    return { status: "error", message: `Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später erneut oder schreiben Sie an ${site.contact.email}.` };
  }

  /* ---------- Mit Datenbank: Anfrage speichern, Kunde anlegen, Benachrichtigung ---------- */
  if (env.databaseConfigured) {
    const { db } = await import("@/lib/supabase/admin");
    const { clientIpHash, rateLimit, userAgent } = await import("@/lib/security");
    const ipHash = await clientIpHash();
    if (!(await rateLimit(`contact:${ipHash}`, 6, 600))) {
      return { status: "error", message: `Zu viele Anfragen in kurzer Zeit. Bitte schreiben Sie uns direkt an ${site.contact.email}.` };
    }
    const attribution = readAttribution(formData);
    const client = db();

    // Kunde (Lead) über die E-Mail-Adresse finden oder anlegen
    const { data: existing } = await client.from("customers").select("id, name, email, marketing_status").eq("email", email).maybeSingle();
    let customer = existing;
    if (!customer) {
      const { data: created } = await client
        .from("customers")
        .insert({
          kind: company ? "firma" : "privat",
          status: "lead",
          name,
          company_name: company || null,
          email,
          phone: phone || null,
          source: "kontaktformular",
          utm: attribution,
          last_contact_at: new Date().toISOString(),
        })
        .select("id, name, email, marketing_status")
        .single();
      customer = created;
    } else {
      await client.from("customers").update({ last_contact_at: new Date().toISOString(), ...(phone ? { phone } : {}) }).eq("id", existing!.id);
    }

    const { data: inquiry, error } = await client
      .from("inquiries")
      .insert({
        name,
        company_name: company || null,
        email,
        phone: phone || null,
        message,
        interests,
        customer_id: customer?.id ?? null,
        utm: attribution,
        landing_page: attribution.landing ?? null,
        referrer: attribution.referrer ?? null,
        marketing_opt_in: marketing,
        ip_hash: ipHash,
      })
      .select("id, reference")
      .single();

    if (error || !inquiry) {
      console.error("[kontakt] Anfrage konnte nicht gespeichert werden", error);
    } else {
      const ua = await userAgent();
      after(async () => {
        const { getSettings } = await import("@/lib/settings/server");
        const { mailCompany } = await import("@/lib/admin/company");
        const { sendMail } = await import("@/lib/email/send");
        const { inquiryNotificationEmail } = await import("@/lib/email/templates");
        const { startDoubleOptIn } = await import("@/lib/marketing/server");
        const settings = await getSettings();
        if (settings.notifications.notifyOnInquiry) {
          const res = await sendMail(
            settings.notifications.inbox || getContactRecipient(site.contact.email),
            inquiryNotificationEmail({
              siteUrl: env.siteUrl,
              company: mailCompany(settings),
              reference: inquiry.reference,
              name,
              companyName: company || null,
              email,
              phone: phone || null,
              interests,
              message,
              marketing,
              adminUrl: `${env.siteUrl}/admin/anfragen/${inquiry.id}`,
            }),
            { kind: "anfrage", relatedId: inquiry.id, replyTo: email },
          );
          if (res.ok) await client.from("inquiries").update({ email_delivered: true }).eq("id", inquiry.id);
        }
        if (marketing && customer) {
          await startDoubleOptIn({ id: customer.id, email, name, marketing_status: customer.marketing_status }, { source: "kontaktformular", ipHash, userAgent: ua });
        }
      });
      return {
        status: "success",
        message: marketing
          ? `${SUCCESS} Für den Newsletter haben wir Ihnen eine Bestätigungs-E-Mail gesendet – bitte klicken Sie dort auf den Link.`
          : SUCCESS,
      };
    }
  }

  /* ---------- Ohne Datenbank (oder bei Speicherfehler): direkt per E-Mail ---------- */
  if (!isSmtpConfigured()) {
    console.error("[kontakt] SMTP is not configured – contact request could not be delivered.");
    return {
      status: "error",
      message: `Das Formular ist gerade nicht erreichbar. Bitte schreiben Sie uns direkt an ${site.contact.email} oder rufen Sie an: ${site.contact.phone}.`,
    };
  }

  const text = [
    "Neue Anfrage über quickdesign24.de",
    "",
    `Name: ${name}`,
    company ? `Firma: ${company}` : null,
    `E-Mail: ${email}`,
    phone ? `Telefon: ${phone}` : null,
    interests.length ? `Interesse: ${interests.join(", ")}` : null,
    "",
    "Nachricht:",
    message,
  ]
    .filter((line) => line !== null)
    .join("\r\n");

  try {
    await sendSmtpMail({ to: getContactRecipient(site.contact.email), subject: `Anfrage von ${name}${company ? ` (${company})` : ""}`, text, replyTo: email });
  } catch (error) {
    console.error("[kontakt] Failed to send contact request", error);
    return { status: "error", message: `Ihre Nachricht konnte leider nicht gesendet werden. Bitte schreiben Sie uns direkt an ${site.contact.email}.` };
  }

  return { status: "success", message: SUCCESS };
}
