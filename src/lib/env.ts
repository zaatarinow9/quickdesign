import "server-only";

import { extractEmailAddress, isValidEmailAddress } from "@/lib/email/address";

const DEVELOPMENT_ADMIN_SESSION_SECRET = "development-admin-session-secret";
const DEVELOPMENT_DOCUMENT_SHARE_SECRET =
  "development-order-document-share-secret";
const MINIMUM_SECRET_LENGTH = 32;

export type EnvironmentReadinessWarning = {
  id: string;
  level: "warning" | "error";
  message: string;
  surface?: "dashboard" | "diagnostics" | "all";
};

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
    case "1":
    case "true":
    case "yes":
      return true;
    case "0":
    case "false":
    case "no":
      return false;
    default:
      return null;
  }
}

function normalizeUrlValue(value: string): string | null {
  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizePathValue(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("/") || trimmedValue === "/") {
    return null;
  }

  if (trimmedValue.includes("?") || trimmedValue.includes("#")) {
    return null;
  }

  return trimmedValue.replace(/\/+$/, "");
}

function detectDatabaseProviderTarget(
  databaseUrl: string,
): "postgresql" | "sqlite" | "unknown" {
  const normalizedValue = databaseUrl.trim().toLowerCase();

  if (
    normalizedValue.startsWith("postgresql://") ||
    normalizedValue.startsWith("postgres://")
  ) {
    return "postgresql";
  }

  if (
    normalizedValue.startsWith("file:") ||
    normalizedValue.startsWith("sqlite:") ||
    normalizedValue.includes("dev.db")
  ) {
    return "sqlite";
  }

  return "unknown";
}

function hasStrongSecret(value: string): boolean {
  return value.length >= MINIMUM_SECRET_LENGTH;
}

function getWarningLevel(): "warning" | "error" {
  return isProductionEnvironment() ? "error" : "warning";
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getConfiguredAppBaseUrl(): string | null {
  const appUrl = readEnvValue("APP_URL");
  const publicAppUrl = readEnvValue("NEXT_PUBLIC_APP_URL");

  return normalizeUrlValue(appUrl) ?? normalizeUrlValue(publicAppUrl);
}

export function getPublicAppBaseUrl(): string {
  const configuredBaseUrl = getConfiguredAppBaseUrl();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (isProductionEnvironment()) {
    throw new Error(
      "APP_URL or NEXT_PUBLIC_APP_URL must be configured in production.",
    );
  }

  return "http://localhost:3000";
}

export function getAdminSessionSecret(): string {
  const sessionSecret = readEnvValue("ADMIN_SESSION_SECRET");

  if (sessionSecret) {
    if (isProductionEnvironment() && !hasStrongSecret(sessionSecret)) {
      throw new Error(
        `ADMIN_SESSION_SECRET must be at least ${MINIMUM_SECRET_LENGTH} characters long in production.`,
      );
    }

    return sessionSecret;
  }

  const legacySecret = !isProductionEnvironment()
    ? readEnvValue("NEXTAUTH_SECRET")
    : "";

  if (legacySecret) {
    return legacySecret;
  }

  if (isProductionEnvironment()) {
    throw new Error("ADMIN_SESSION_SECRET must be configured in production.");
  }

  return DEVELOPMENT_ADMIN_SESSION_SECRET;
}

export function getOrderDocumentShareSecret(): string {
  const documentSecret = readEnvValue("ORDER_DOCUMENT_SHARE_SECRET");

  if (documentSecret) {
    if (isProductionEnvironment() && !hasStrongSecret(documentSecret)) {
      throw new Error(
        `ORDER_DOCUMENT_SHARE_SECRET must be at least ${MINIMUM_SECRET_LENGTH} characters long in production.`,
      );
    }

    return documentSecret;
  }

  const fallbackSecret = !isProductionEnvironment()
    ? readEnvValue("ADMIN_SESSION_SECRET") || readEnvValue("NEXTAUTH_SECRET")
    : "";

  if (fallbackSecret) {
    return fallbackSecret;
  }

  if (isProductionEnvironment()) {
    throw new Error(
      "ORDER_DOCUMENT_SHARE_SECRET must be configured in production.",
    );
  }

  return DEVELOPMENT_DOCUMENT_SHARE_SECRET;
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
    throw new Error(
      "SMTP_FROM must contain a valid sender address or mailbox.",
    );
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    envelopeFrom,
  };
}

export function getEnvironmentReadinessWarnings(options?: {
  surface?: "dashboard" | "diagnostics" | "all";
}): EnvironmentReadinessWarning[] {
  const warnings: EnvironmentReadinessWarning[] = [];
  const requestedSurface = options?.surface ?? "all";
  const warningLevel = getWarningLevel();
  const databaseUrl = readEnvValue("DATABASE_URL");
  const adminSessionSecret = readEnvValue("ADMIN_SESSION_SECRET");
  const documentShareSecret = readEnvValue("ORDER_DOCUMENT_SHARE_SECRET");
  const adminLoginPath = readEnvValue("ADMIN_LOGIN_PATH");
  const appUrl = readEnvValue("APP_URL");
  const publicAppUrl = readEnvValue("NEXT_PUBLIC_APP_URL");
  const hasConfiguredAppUrl = Boolean(appUrl || publicAppUrl);
  const hasValidConfiguredAppUrl = Boolean(
    normalizeUrlValue(appUrl) ?? normalizeUrlValue(publicAppUrl),
  );
  const smtpValues = {
    host: readEnvValue("SMTP_HOST"),
    port: readEnvValue("SMTP_PORT"),
    secure: readEnvValue("SMTP_SECURE"),
    user: readEnvValue("SMTP_USER"),
    pass: readEnvValue("SMTP_PASS"),
    from: readEnvValue("SMTP_FROM"),
  };

  if (!databaseUrl) {
    warnings.push({
      id: "database_url_missing",
      level: "error",
      message:
        "DATABASE_URL fehlt. Ohne Datenbankverbindung kann die Anwendung nicht starten.",
    });
  } else if (detectDatabaseProviderTarget(databaseUrl) === "sqlite") {
    warnings.push({
      id: "database_url_sqlite",
      level: warningLevel,
      message:
        "DATABASE_URL zeigt auf lokale SQLite. Fuer Admin-Authentifizierung und Benutzerverwaltung muss Supabase PostgreSQL verwendet werden.",
    });
  }

  if (!adminSessionSecret) {
    warnings.push({
      id: "admin_session_secret_missing",
      level: warningLevel,
      message:
        "ADMIN_SESSION_SECRET fehlt. Setzen Sie vor dem Deployment einen eigenen langen Secret-Wert fuer Admin-Sessions.",
    });
  } else if (!hasStrongSecret(adminSessionSecret)) {
    warnings.push({
      id: "admin_session_secret_weak",
      level: warningLevel,
      message: `ADMIN_SESSION_SECRET ist zu kurz. Verwenden Sie mindestens ${MINIMUM_SECRET_LENGTH} Zeichen.`,
    });
  }

  if (!documentShareSecret) {
    warnings.push({
      id: "document_share_secret_missing",
      level: warningLevel,
      message:
        "ORDER_DOCUMENT_SHARE_SECRET fehlt. Dokumentfreigaben sollten in Produktion mit einem eigenen Secret signiert werden.",
    });
  } else if (!hasStrongSecret(documentShareSecret)) {
    warnings.push({
      id: "document_share_secret_weak",
      level: warningLevel,
      message: `ORDER_DOCUMENT_SHARE_SECRET ist zu kurz. Verwenden Sie mindestens ${MINIMUM_SECRET_LENGTH} Zeichen.`,
    });
  }

  if (
    adminSessionSecret &&
    documentShareSecret &&
    adminSessionSecret === documentShareSecret
  ) {
    warnings.push({
      id: "shared_secrets_reused",
      level: "warning",
      message:
        "ADMIN_SESSION_SECRET und ORDER_DOCUMENT_SHARE_SECRET sollten getrennt gesetzt werden, damit Sitzungen und Dokumentlinks nicht dasselbe Secret teilen.",
    });
  }

  if (!adminLoginPath) {
    warnings.push({
      id: "admin_login_path_missing",
      level: "warning",
      message:
        "ADMIN_LOGIN_PATH fehlt. Legen Sie fuer Produktion einen nicht offensichtlichen Admin-Login-Pfad fest.",
      surface: "diagnostics",
    });
  } else if (!normalizePathValue(adminLoginPath)) {
    warnings.push({
      id: "admin_login_path_invalid",
      level: "warning",
      message:
        "ADMIN_LOGIN_PATH ist ungueltig. Verwenden Sie einen absoluten Pfad wie /zugang-q24 ohne Query oder Fragment.",
      surface: "diagnostics",
    });
  }

  if (!hasConfiguredAppUrl) {
    warnings.push({
      id: "app_url_missing",
      level: warningLevel,
      message:
        "APP_URL oder NEXT_PUBLIC_APP_URL fehlt. Dokument-E-Mails sollten in Produktion eine feste Basis-URL verwenden.",
    });
  } else if (!hasValidConfiguredAppUrl) {
    warnings.push({
      id: "app_url_invalid",
      level: warningLevel,
      message:
        "APP_URL bzw. NEXT_PUBLIC_APP_URL ist ungueltig. Verwenden Sie eine vollstaendige http/https-URL.",
    });
  }

  const smtpEntries = Object.entries(smtpValues);
  const missingSmtpKeys = smtpEntries
    .filter(([, value]) => value === "")
    .map(([key]) => key.toUpperCase());

  if (missingSmtpKeys.length > 0) {
    warnings.push({
      id: "smtp_missing",
      level: warningLevel,
      message: `SMTP ist unvollstaendig konfiguriert. Es fehlen: ${missingSmtpKeys.join(", ")}.`,
    });
  } else {
    try {
      getSmtpEnvironmentConfig();
    } catch {
      warnings.push({
        id: "smtp_invalid",
        level: warningLevel,
        message:
          "SMTP ist gesetzt, aber ungueltig. Pruefen Sie insbesondere SMTP_PORT, SMTP_SECURE und SMTP_FROM.",
      });
    }
  }

  if (requestedSurface === "all") {
    return warnings;
  }

  return warnings.filter((warning) => {
    const surface = warning.surface ?? "all";
    return surface === "all" || surface === requestedSurface;
  });
}
