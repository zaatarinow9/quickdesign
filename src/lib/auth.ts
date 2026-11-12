import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { supabaseAuth } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings/server";

/**
 * Rollen:
 *  - owner:   Inhaber (E-Mail in ADMIN_EMAILS) – voller Zugriff
 *  - admin:   Administrator – voller Zugriff (außer Inhaber entfernen)
 *  - manager: Mitarbeiter – Anfragen, Kunden, Angebote, Rechnungen
 */
export type AdminRole = "owner" | "admin" | "manager";
export const roleLabels: Record<AdminRole, string> = { owner: "Inhaber", admin: "Administrator", manager: "Mitarbeiter" };
export const hasFullAccess = (role: AdminRole) => role === "owner" || role === "admin";
export type AdminUser = { id: string; email: string; role: AdminRole; name: string | null };

export function isOwnerEmail(email: string | undefined | null): boolean {
  return !!email && env.adminEmails.includes(email.toLowerCase());
}

export async function resolveRole(user: { id: string; email?: string | null; email_confirmed_at?: string | null }) {
  if (!user.email || !user.email_confirmed_at) return null;
  if (isOwnerEmail(user.email)) return { role: "owner" as AdminRole, name: null as string | null };
  const { data } = await db()
    .from("admin_users")
    .select("full_name, active, auth_user_id, role, accepted_at")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  if (!data || !data.active || data.auth_user_id !== user.id) return null;
  return { role: (data.role === "admin" ? "admin" : "manager") as AdminRole, name: (data.full_name as string | null) ?? null };
}

export type Factor = { id: string; status: string; factor_type: string; friendly_name?: string | null; created_at?: string };

function sessionAal(accessToken: string | undefined): string | null {
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8")) as { aal?: string };
    return payload.aal ?? null;
  } catch {
    return null;
  }
}

export type AuthState =
  | { status: "none" }
  | { status: "mfa"; email: string; factorId: string }
  | { status: "enroll"; admin: AdminUser }
  | { status: "ok"; admin: AdminUser; factors: Factor[] };

export const getAuthState = cache(async (): Promise<AuthState> => {
  try {
    const supabase = await supabaseAuth();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return { status: "none" };
    const role = await resolveRole(data.user);
    if (!role) return { status: "none" };
    const verified = ((data.user.factors ?? []) as Factor[]).filter((f) => f.factor_type === "totp" && f.status === "verified");
    if (verified.length > 0) {
      const { data: session } = await supabase.auth.getSession();
      if (sessionAal(session.session?.access_token) !== "aal2") {
        return { status: "mfa", email: data.user.email, factorId: verified[0].id };
      }
    }
    const admin: AdminUser = { id: data.user.id, email: data.user.email, role: role.role, name: role.name };
    if (verified.length === 0 && (await getSettings()).security.require2fa) return { status: "enroll", admin };
    return { status: "ok", admin, factors: verified };
  } catch {
    return { status: "none" };
  }
});

export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const state = await getAuthState();
  return state.status === "ok" ? state.admin : null;
});

export async function requireAdmin(): Promise<AdminUser> {
  const state = await getAuthState();
  if (state.status === "mfa") redirect("/admin/login/bestaetigen");
  if (state.status === "enroll") redirect("/admin/sicherheit?pflicht=1");
  if (state.status !== "ok") redirect("/admin/login");
  return state.admin;
}

export async function requireFullAccess(): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (!hasFullAccess(admin.role)) redirect("/admin?kein-zugriff=1");
  return admin;
}

export async function assertAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new Error("UNAUTHORIZED");
  return admin;
}

export async function assertFullAccess(): Promise<AdminUser> {
  const admin = await assertAdmin();
  if (!hasFullAccess(admin.role)) throw new Error("FORBIDDEN");
  return admin;
}

/** Angemeldet (Passwort + ggf. Code), auch wenn die Pflicht-Einrichtung von 2FA noch aussteht */
export async function assertSession(): Promise<AdminUser> {
  const state = await getAuthState();
  if (state.status === "ok" || state.status === "enroll") return state.admin;
  throw new Error("UNAUTHORIZED");
}
