import type { Prisma } from "@prisma/client";
import { normalizeEmailAddress } from "@/lib/email/address";
import {
  normalizeAdminRole,
  type AdminRole,
} from "@/lib/admin/permissions";

const ADMIN_ROLE_VALUES = ["SUPER_ADMIN", "ADMIN", "STAFF"] as const;

export const ADMIN_ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Staff" },
] as const satisfies ReadonlyArray<{
  value: AdminRole;
  label: string;
}>;

export function normalizeAdminUsername(
  value: string | null | undefined,
): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeAdminDisplayName(
  value: string | null | undefined,
  fallbackUsername: string,
): string {
  const trimmedValue = typeof value === "string" ? value.trim() : "";

  return trimmedValue || fallbackUsername;
}

export function normalizeAdminLoginIdentifier(
  value: string | null | undefined,
): {
  raw: string;
  username: string;
  email: string | null;
} {
  const raw = typeof value === "string" ? value.trim() : "";

  return {
    raw,
    username: normalizeAdminUsername(raw),
    email: normalizeEmailAddress(raw),
  };
}

export function parseAdminRole(value: string | null | undefined): AdminRole | null {
  return ADMIN_ROLE_VALUES.includes(value as AdminRole)
    ? (value as AdminRole)
    : null;
}

export function buildAdminUserConflictWhere({
  username,
  email,
  excludeUserId,
}: {
  username: string;
  email: string | null;
  excludeUserId?: string;
}): Prisma.AdminUserWhereInput {
  const orClauses: Prisma.AdminUserWhereInput[] = [];

  if (username) {
    orClauses.push({
      username: {
        equals: username,
        mode: "insensitive",
      },
    });
  }

  if (email) {
    orClauses.push({
      email: {
        equals: email,
        mode: "insensitive",
      },
    });
  }

  return {
    ...(excludeUserId
      ? {
          id: {
            not: excludeUserId,
          },
        }
      : {}),
    OR: orClauses,
  };
}

export function getAdminRoleLabel(role: string): string {
  switch (normalizeAdminRole(role)) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Admin";
    case "STAFF":
    default:
      return "Staff";
  }
}

export function getAdminRoleBadgeClassName(role: string): string {
  switch (normalizeAdminRole(role)) {
    case "SUPER_ADMIN":
      return "bg-rose-100 text-rose-700";
    case "ADMIN":
      return "bg-sky-100 text-sky-700";
    case "STAFF":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function getAdminStatusBadgeClassName(isActive: boolean): string {
  return isActive
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-800";
}

export function getAdminStatusLabel(isActive: boolean): string {
  return isActive ? "Aktiv" : "Inaktiv";
}

export function getAdminUsersSuccessMessage(
  successCode: string | undefined,
): string | null {
  switch (successCode) {
    case "created":
      return "Benutzer wurde erstellt.";
    case "updated":
      return "Benutzer wurde aktualisiert.";
    case "passwordReset":
      return "Passwort wurde zurueckgesetzt.";
    case "deactivated":
      return "Benutzer wurde deaktiviert.";
    case "activated":
      return "Benutzer wurde aktiviert.";
    default:
      return null;
  }
}

export function getAdminUsersErrorMessage(
  errorCode: string | undefined,
): string | null {
  switch (errorCode) {
    case "forbidden":
      return "Sie haben keine Berechtigung fuer diese Aktion.";
    case "usernameRequired":
      return "Benutzername ist erforderlich.";
    case "passwordRequired":
      return "Passwort ist erforderlich.";
    case "passwordTooShort":
      return "Passwort muss mindestens 10 Zeichen lang sein.";
    case "passwordComplexity":
      return "Das Passwort muss mindestens einen Buchstaben und eine Zahl enthalten.";
    case "passwordMismatch":
      return "Die Passwoerter stimmen nicht ueberein.";
    case "email":
      return "Bitte geben Sie eine gueltige E-Mail-Adresse ein.";
    case "duplicate":
      return "Benutzername oder E-Mail-Adresse ist bereits vergeben.";
    case "selfProtection":
      return "Der eigene Super-Admin-Zugriff kann nicht deaktiviert oder herabgestuft werden.";
    case "lastSuperAdmin":
      return "Mindestens ein aktiver Super-Admin muss erhalten bleiben.";
    case "role":
      return "Bitte waehlen Sie eine gueltige Rolle aus.";
    case "notFound":
      return "Benutzer wurde nicht gefunden.";
    default:
      return null;
  }
}
