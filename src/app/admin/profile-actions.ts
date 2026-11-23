"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";

/** Profilbild (bereits zugeschnitten, JPEG als Data-URL) + Anzeigename speichern */
export async function saveProfile(input: { image?: string | null; name?: string; removeImage?: boolean }): Promise<{ ok?: string; error?: string; avatar?: string | null }> {
  const admin = await assertAdmin();
  const email = admin.email.toLowerCase();
  const client = db();
  const patch: Record<string, unknown> = { email, updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.display_name = input.name.trim().slice(0, 80) || null;
  if (input.removeImage) patch.avatar_url = null;
  if (input.image) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(input.image);
    if (!m) return { error: "Ungültiges Bild." };
    const buf = Buffer.from(m[1], "base64");
    if (buf.length > 1_500_000) return { error: "Bild zu groß." };
    const hash = Buffer.from(email).toString("hex").slice(0, 24);
    const path = `avatare/${hash}-${Date.now()}.jpg`;
    const { error } = await client.storage.from("team").upload(path, buf, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
    if (error) return { error: "Hochladen fehlgeschlagen." };
    patch.avatar_url = client.storage.from("team").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await client.from("staff_profiles").upsert(patch, { onConflict: "email" });
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath("/admin", "layout");
  return { ok: "Profil gespeichert.", avatar: (patch.avatar_url as string | null | undefined) ?? undefined };
}
