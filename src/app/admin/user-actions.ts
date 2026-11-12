"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertFullAccess, isOwnerEmail, roleLabels } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { supabaseAuth } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { clientIpHash, hashKey, rateLimit } from "@/lib/security";
import { getSettings } from "@/lib/settings/server";
import { mailCompany } from "@/lib/admin/company";
import { logActivity } from "@/lib/admin/log";
import { sendMail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import type { ActionState } from "./document-actions";

const inviteSchema = z.object({
  email: z.email({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }).max(254),
  full_name: z.string().trim().min(2, { error: "Bitte einen Namen angeben." }).max(120),
  role: z.enum(["admin", "manager"]),
});

async function linkFor(type: "invite" | "recovery", email: string) {
  const { data, error } = await db().auth.admin.generateLink({ type, email });
  if (error || !data?.properties?.hashed_token) return { error: error?.message ?? "Link konnte nicht erzeugt werden." };
  return {
    userId: data.user?.id ?? null,
    url: `${env.siteUrl}/admin/login/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${type}`,
  };
}

export async function inviteUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertFullAccess();
  const parsed = inviteSchema.safeParse({
    email: String(fd.get("email") ?? "").trim().toLowerCase(),
    full_name: fd.get("full_name"),
    role: fd.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const { email, full_name, role } = parsed.data;
  if (isOwnerEmail(email)) return { error: "Diese Adresse ist bereits als Inhaber hinterlegt." };
  if (role === "admin" && admin.role !== "owner") return { error: "Nur der Inhaber kann Administratoren einladen." };

  const client = db();
  const { error: upsertError } = await client
    .from("admin_users")
    .upsert({ email, full_name, role, active: true, invited_by: admin.email }, { onConflict: "email" });
  if (upsertError) return { error: "Zugang konnte nicht angelegt werden." };

  // Bestehendes Konto (z. B. erneute Einladung) → Passwort-Link, sonst Einladungslink
  let link = await linkFor("invite", email);
  if ("error" in link) link = await linkFor("recovery", email);
  if ("error" in link) return { error: `Einladung fehlgeschlagen: ${link.error}` };
  if (link.userId) await client.from("admin_users").update({ auth_user_id: link.userId }).eq("email", email);

  const settings = await getSettings();
  const res = await sendMail(email, inviteEmail({ siteUrl: env.siteUrl, company: mailCompany(settings), name: full_name, role: roleLabels[role], url: link.url }), { kind: "einladung" });
  await logActivity(admin.email, "eingeladen", "benutzer", email, `${full_name} (${roleLabels[role]}) eingeladen`);
  revalidatePath("/admin/benutzer");
  if (!res.ok) return { error: `Zugang angelegt, aber die E-Mail konnte nicht gesendet werden (${res.error}).` };
  return { ok: `Einladung an ${email} gesendet.` };
}

export async function updateUser(fd: FormData) {
  const admin = await assertFullAccess();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const action = String(fd.get("action") ?? "");
  const client = db();
  const { data: user } = await client.from("admin_users").select("email, role, auth_user_id").eq("id", id.data).maybeSingle();
  if (!user) return;
  if (user.role === "admin" && admin.role !== "owner") return;
  if (action === "deactivate" || action === "activate") {
    await client.from("admin_users").update({ active: action === "activate" }).eq("id", id.data);
  } else if (action === "role") {
    const role = fd.get("role") === "admin" ? "admin" : "manager";
    if (role === "admin" && admin.role !== "owner") return;
    await client.from("admin_users").update({ role }).eq("id", id.data);
  } else if (action === "delete") {
    await client.from("admin_users").delete().eq("id", id.data);
    if (user.auth_user_id) await client.auth.admin.deleteUser(user.auth_user_id);
  }
  await logActivity(admin.email, "benutzer", "benutzer", user.email, `${user.email}: ${action}`);
  revalidatePath("/admin/benutzer");
}

/** Öffentlich (Login-Seite): Link zum Zurücksetzen – antwortet immer neutral */
export async function requestPasswordReset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const neutral = { ok: "Falls ein Zugang zu dieser Adresse besteht, haben wir Ihnen einen Link gesendet. Bitte prüfen Sie Ihr Postfach." };
  if (!z.email().safeParse(email).success) return { error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  const ip = await clientIpHash();
  if (!(await rateLimit(`reset-ip:${ip}`, 5, 3600)) || !(await rateLimit(`reset:${hashKey(email)}`, 3, 3600))) return neutral;

  const allowed = isOwnerEmail(email) || !!(await db().from("admin_users").select("id").eq("email", email).eq("active", true).maybeSingle()).data;
  if (!allowed) return neutral;
  if (isOwnerEmail(email)) await db().from("auth_allowlist").upsert({ email, note: "Inhaber" });

  let link = await linkFor("recovery", email);
  // Inhaber ohne bestehendes Konto: Konto wird über einen Einladungslink angelegt
  if ("error" in link && isOwnerEmail(email)) link = await linkFor("invite", email);
  if ("error" in link) return neutral;
  const settings = await getSettings();
  await sendMail(
    email,
    inviteEmail({ siteUrl: env.siteUrl, company: mailCompany(settings), name: email, role: "Zugang", url: link.url }),
    { kind: "passwort" },
  );
  return neutral;
}

export async function setInitialPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 12) return { error: "Das Passwort muss mindestens 12 Zeichen lang sein." };
  if (password !== confirm) return { error: "Die Passwörter stimmen nicht überein." };
  const supabase = await supabaseAuth();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return { error: "Die Sitzung ist abgelaufen. Bitte fordern Sie einen neuen Link an." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Das Passwort konnte nicht gespeichert werden. Bitte wählen Sie ein anderes." };
  const email = data.user.email.toLowerCase();
  await db().from("admin_users").update({ accepted_at: new Date().toISOString(), auth_user_id: data.user.id }).eq("email", email).is("accepted_at", null);
  await logActivity(email, "passwort", "konto", data.user.id, "Passwort festgelegt");
  redirect("/admin");
}
