import "server-only";

import { extractEmailAddress, isValidEmailAddress } from "@/lib/email/address";

export type SmtpEnvironmentConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  envelopeFrom: string;
};

function readEnvValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function normalizeBooleanEnvValue(value: string): boolean | null {
  switch (value.trim().toLowerCase()) {
    case "true":
    case "1":
    case "yes":
      return true;
    case "false":
    case "0":
    case "no":
      return false;
    default:
      return null;
  }
}

/** True when every SMTP variable is present — used to degrade the contact form gracefully. */
export function isSmtpConfigured(): boolean {
  return ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"].every(
    (name) => readEnvValue(name).length > 0,
  );
}

/** Recipient for contact form submissions. Falls back to the public company address. */
export function getContactRecipient(fallback: string): string {
  return readEnvValue("CONTACT_RECIPIENT") || fallback;
}

export function getSmtpEnvironmentConfig(): SmtpEnvironmentConfig {
  const host = readEnvValue("SMTP_HOST");
  const portRawValue = readEnvValue("SMTP_PORT");
  const secureRawValue = readEnvValue("SMTP_SECURE");
  const user = readEnvValue("SMTP_USER");
  const pass = readEnvValue("SMTP_PASS");
  const from = readEnvValue("SMTP_FROM");

  if (!host || !portRawValue || !secureRawValue || !user || !pass || !from) {
    throw new Error(
      "SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS and SMTP_FROM must all be configured.",
    );
  }

  const port = Number.parseInt(portRawValue, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_PORT must be a valid TCP port number.");
  }

  const secure = normalizeBooleanEnvValue(secureRawValue);
  if (secure === null) {
    throw new Error("SMTP_SECURE must be set to true/false, 1/0 or yes/no.");
  }

  const envelopeFrom = extractEmailAddress(from);
  if (!isValidEmailAddress(envelopeFrom)) {
    throw new Error("SMTP_FROM must contain a valid sender address or mailbox.");
  }

  return { host, port, secure, user, pass, from, envelopeFrom };
}

/* ------------------------------------------------------------------ */
/* Verwaltung / Datenbank                                              */
/* ------------------------------------------------------------------ */

function required(name: string): string {
  const value = readEnvValue(name);
  if (!value) throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabasePublishableKey() {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  /** True, wenn die Datenbank konfiguriert ist (sonst arbeitet die Website ohne Speicherung weiter). */
  get databaseConfigured() {
    return Boolean(readEnvValue("NEXT_PUBLIC_SUPABASE_URL") && readEnvValue("SUPABASE_SECRET_KEY"));
  },
  /** Inhaber: kommagetrennte E-Mail-Adressen mit vollem Zugriff auf /admin */
  get adminEmails(): string[] {
    return readEnvValue("ADMIN_EMAILS")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  },
  get siteUrl() {
    return (readEnvValue("NEXT_PUBLIC_SITE_URL") || "https://quickdesign24.de").replace(/\/$/, "");
  },
  get ipHashSalt() {
    const salt = readEnvValue("IP_HASH_SALT");
    if (salt) return salt;
    // Ohne eigenes Salz: aus dem geheimen Server-Schlüssel abgeleitet (nie ein öffentlich bekannter Wert)
    return `derived:${readEnvValue("SUPABASE_SECRET_KEY")}`;
  },
  get cronSecret() {
    return readEnvValue("CRON_SECRET");
  },
};
