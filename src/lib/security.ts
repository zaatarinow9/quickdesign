import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";

/** IP-Adresse des Aufrufers – nur gehasht verwendet/gespeichert (keine Klar-IP in der Datenbank). */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`${env.ipHashSalt}:${ip}`).digest("hex").slice(0, 32);
}

export async function userAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent")?.slice(0, 300) ?? null;
}

/** Prüft, ob die Anfrage von der eigenen Website stammt (CSRF-Schutz für JSON-Endpunkte). */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ab = createHash("sha256").update(a).digest();
  const bb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ab, bb) && a.length === b.length;
}

export function hashKey(value: string): string {
  return createHash("sha256").update(`${env.ipHashSalt}:${value.trim().toLowerCase()}`).digest("hex").slice(0, 32);
}

/**
 * Fixed-Window-Rate-Limit in der Datenbank. Bei Datenbankfehlern standardmäßig nicht blockieren
 * (fail-open), für sensible Vorgänge (Anmeldung) mit failClosed blockieren.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number, opts: { failClosed?: boolean } = {}): Promise<boolean> {
  const onError = !opts.failClosed;
  try {
    const { data, error } = await db().rpc("check_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) return onError;
    return data === true;
  } catch {
    return onError;
  }
}

export const isToken = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
