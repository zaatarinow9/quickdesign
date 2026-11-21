import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/admin";
import { hasFullAccess, resolveRole, type AdminUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings/server";

/**
 * Anmeldung der Mitarbeiter-App: Supabase-Zugangstoken im Header
 * „Authorization: Bearer …“. Gleiche Regeln wie die Verwaltung:
 * aktive Rolle, bei eingerichteter Zwei-Faktor-Anmeldung nur mit aal2,
 * und falls 2FA Pflicht ist, ohne eingerichteten Faktor kein Zugriff.
 */
export type AppUser = AdminUser & { full: boolean };

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

function aal(token: string): string | null {
  try {
    return (JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { aal?: string }).aal ?? null;
  } catch {
    return null;
  }
}

export async function appUser(req: Request): Promise<AppUser> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 4000) throw new AppError(401, "unauthorized");
  let res: Awaited<ReturnType<ReturnType<typeof db>["auth"]["getUser"]>> | null = null;
  try {
    res = await db().auth.getUser(token);
  } catch {
    res = null;
  }
  const data = res?.data;
  if (!res || res.error || !data?.user?.email) throw new AppError(401, "unauthorized");
  const role = await resolveRole(data.user);
  if (!role) throw new AppError(403, "no_access");
  const verified = (data.user.factors ?? []).filter((f) => f.factor_type === "totp" && f.status === "verified");
  if (verified.length && aal(token) !== "aal2") throw new AppError(401, "mfa_required");
  if (!verified.length && (await getSettings()).security.require2fa) throw new AppError(403, "mfa_enroll");
  return { id: data.user.id, email: data.user.email.toLowerCase(), role: role.role, name: role.name, full: hasFullAccess(role.role) };
}

/** Route-Hülle: Anmeldung prüfen, Fehler einheitlich als JSON */
export function route<C = unknown>(fn: (req: Request, user: AppUser, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    try {
      const user = await appUser(req);
      const out = await fn(req, user, ctx);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true }, { headers: { "cache-control": "no-store" } });
    } catch (e) {
      if (e instanceof AppError) return NextResponse.json({ error: e.code }, { status: e.status });
      console.error("[app-api]", e);
      return NextResponse.json({ error: "server" }, { status: 500 });
    }
  };
}

export const needFull = (u: AppUser) => {
  if (!u.full) throw new AppError(403, "forbidden");
};

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new AppError(400, "bad_json");
  }
}

export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
export function idOf(params: { id?: string }) {
  if (!isUuid(params.id)) throw new AppError(404, "not_found");
  return params.id;
}
