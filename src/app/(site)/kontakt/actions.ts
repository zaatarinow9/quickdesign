"use server";

import { headers } from "next/headers";
import { normalizeEmailAddress } from "@/lib/email/address";
import { sendSmtpMail } from "@/lib/email/smtp";
import { getContactRecipient, isSmtpConfigured } from "@/lib/env";
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

function isRateLimited(key: string): boolean {
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

export async function sendContactRequest(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  // Spam traps: hidden honeypot field and implausibly fast submissions are
  // answered with a neutral success so bots learn nothing.
  const startedAt = Number(read(formData, "startedAt", 20));
  if (read(formData, "website") || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_TIME_MS) {
    return { status: "success", message: "Vielen Dank! Ihre Nachricht ist bei uns eingegangen." };
  }

  const name = read(formData, "name", 120);
  const company = read(formData, "company", 160);
  const email = normalizeEmailAddress(read(formData, "email", 200));
  const phone = read(formData, "phone", 60);
  const message = read(formData, "message", 5000);
  const consent = formData.get("consent") === "on";
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
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Bitte prüfen Sie die markierten Felder.", fieldErrors };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return {
      status: "error",
      message: `Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später erneut oder schreiben Sie an ${site.contact.email}.`,
    };
  }

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
    await sendSmtpMail({
      to: getContactRecipient(site.contact.email),
      subject: `Anfrage von ${name}${company ? ` (${company})` : ""}`,
      text,
      replyTo: email,
    });
  } catch (error) {
    console.error("[kontakt] Failed to send contact request", error);
    return {
      status: "error",
      message: `Ihre Nachricht konnte leider nicht gesendet werden. Bitte schreiben Sie uns direkt an ${site.contact.email}.`,
    };
  }

  return {
    status: "success",
    message: "Vielen Dank! Ihre Nachricht ist bei uns eingegangen. Wir melden uns so schnell wie möglich.",
  };
}
