"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSession, getAuthState, resolveRole } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { clientIpHash, hashKey, rateLimit } from "@/lib/security";
import { logActivity } from "@/lib/admin/log";
import type { ActionState } from "./document-actions";

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse({ email: String(fd.get("email") ?? "").trim().toLowerCase(), password: String(fd.get("password") ?? "") });
  if (!parsed.success) return { error: "Bitte E-Mail und Passwort eingeben." };
  const ip = await clientIpHash();
  // Brute-Force-Schutz: je IP und je Konto (blockiert auch bei Datenbankfehlern)
  if (!(await rateLimit(`login-ip:${ip}`, 20, 900, { failClosed: true })) || !(await rateLimit(`login-user:${hashKey(parsed.data.email)}`, 8, 900, { failClosed: true }))) {
    return { error: "Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten." };
  }
  const supabase = await supabaseAuth();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "E-Mail oder Passwort ist falsch." };
  const role = await resolveRole(data.user);
  if (!role) {
    await supabase.auth.signOut();
    return { error: "Für dieses Konto ist kein Zugang zur Verwaltung freigeschaltet." };
  }
  // Erste Anmeldung eines eingeladenen Mitarbeiters: Zugang als angenommen markieren
  if (role.role !== "owner") {
    await db().from("admin_users").update({ accepted_at: new Date().toISOString() }).eq("email", parsed.data.email).is("accepted_at", null);
  }
  await logActivity(parsed.data.email, "anmeldung", "konto", data.user.id, "Anmeldung");
  const state = await getAuthState();
  if (state.status === "mfa") redirect("/admin/login/bestaetigen");
  redirect("/admin");
}

export async function verifyMfa(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const code = String(fd.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Bitte den 6-stelligen Code eingeben." };
  const state = await getAuthState();
  if (state.status !== "mfa") redirect("/admin");
  const ip = await clientIpHash();
  if (!(await rateLimit(`mfa:${ip}`, 10, 900, { failClosed: true }))) return { error: "Zu viele Versuche. Bitte später erneut versuchen." };
  const supabase = await supabaseAuth();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: state.factorId, code });
  if (error) return { error: "Der Code ist ungültig oder abgelaufen." };
  redirect("/admin");
}

export async function signOut() {
  const supabase = await supabaseAuth();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* ------------------------- Zwei-Faktor-Anmeldung ------------------------- */

export type EnrollState = ActionState & { factorId?: string; qr?: string; secret?: string };

export async function startEnroll(): Promise<EnrollState> {
  await assertSession();
  const supabase = await supabaseAuth();
  // Unvollständige frühere Versuche entfernen
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.all ?? []) {
    if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `QuickDesign ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { error: "Die Einrichtung konnte nicht gestartet werden." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmEnroll(_prev: EnrollState, fd: FormData): Promise<EnrollState> {
  const admin = await assertSession();
  const factorId = String(fd.get("factorId") ?? "");
  const code = String(fd.get("code") ?? "").replace(/\s/g, "");
  if (!factorId || !/^\d{6}$/.test(code)) return { error: "Bitte den 6-stelligen Code aus der App eingeben.", factorId, qr: String(fd.get("qr") ?? ""), secret: String(fd.get("secret") ?? "") };
  const supabase = await supabaseAuth();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "Der Code ist ungültig. Bitte erneut versuchen.", factorId, qr: String(fd.get("qr") ?? ""), secret: String(fd.get("secret") ?? "") };
  await logActivity(admin.email, "2fa", "konto", admin.id, "Zwei-Faktor-Anmeldung aktiviert");
  revalidatePath("/admin/sicherheit");
  return { ok: "Zwei-Faktor-Anmeldung ist aktiv." };
}

export async function removeFactor(fd: FormData) {
  const admin = await assertSession();
  const factorId = String(fd.get("factorId") ?? "");
  const supabase = await supabaseAuth();
  await supabase.auth.mfa.unenroll({ factorId });
  await logActivity(admin.email, "2fa", "konto", admin.id, "Zwei-Faktor-Anmeldung entfernt");
  revalidatePath("/admin/sicherheit");
}

export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertSession();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 12) return { error: "Das Passwort muss mindestens 12 Zeichen lang sein." };
  if (password !== confirm) return { error: "Die Passwörter stimmen nicht überein." };
  const supabase = await supabaseAuth();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Passwort konnte nicht geändert werden (ggf. ist eine erneute Anmeldung mit 2FA nötig)." };
  await logActivity(admin.email, "passwort", "konto", admin.id, "Passwort geändert");
  return { ok: "Passwort geändert." };
}
