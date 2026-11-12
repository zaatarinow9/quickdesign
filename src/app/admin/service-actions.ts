"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin, assertFullAccess } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";
import { netFromGross, parseDecimal } from "@/lib/documents/format";
import type { ActionState } from "./document-actions";

const schema = z.object({
  name: z.string().trim().min(1, { error: "Bitte eine Bezeichnung angeben." }).max(200),
  description: z.string().trim().max(1500).nullable(),
  category: z.string().trim().max(60).nullable(),
  unit: z.string().trim().min(1).max(20),
  price_net: z.number({ error: "Ungültiger Preis." }).min(-1_000_000).max(1_000_000),
  vat_rate: z.union([z.literal(19), z.literal(7), z.literal(0)]),
  is_favorite: z.boolean(),
  active: z.boolean(),
});

function read(fd: FormData) {
  const vat = Number(fd.get("vat_rate") ?? 19);
  const price = parseDecimal(String(fd.get("price") ?? "0")) ?? Number.NaN;
  const mode = fd.get("price_mode") === "brutto" ? "brutto" : "netto";
  return schema.safeParse({
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? "").trim() || null,
    category: String(fd.get("category") ?? "").trim() || null,
    unit: String(fd.get("unit") ?? "Stk.").trim() || "Stk.",
    // Katalogpreise werden netto mit 2 Nachkommastellen gespeichert
    price_net: mode === "brutto" ? Math.round(netFromGross(price, vat) * 100) / 100 : price,
    vat_rate: vat,
    is_favorite: fd.get("is_favorite") === "on",
    active: fd.has("active_present") ? fd.get("active") === "on" : true,
  });
}

export async function saveService(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertFullAccess();
  const parsed = read(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const id = String(fd.get("id") ?? "");
  const client = db();
  if (id) {
    if (!z.uuid().safeParse(id).success) return { error: "Ungültige Leistung." };
    const { error } = await client.from("service_catalog").update(parsed.data).eq("id", id);
    if (error) return { error: "Speichern fehlgeschlagen." };
  } else {
    const { error } = await client.from("service_catalog").insert(parsed.data);
    if (error) return { error: "Leistung konnte nicht angelegt werden." };
  }
  await logActivity(admin.email, id ? "bearbeitet" : "erstellt", "leistung", id || null, `Leistung „${parsed.data.name}“`);
  revalidatePath("/admin/leistungen");
  return { ok: id ? "Leistung gespeichert." : "Leistung angelegt." };
}

/** Aus dem Angebots-/Rechnungseditor: freie Position direkt in den Katalog übernehmen */
export async function addServiceFromEditor(input: { name: string; description?: string; unit: string; price_net: number; vat_rate: number; favorite?: boolean }) {
  await assertAdmin();
  const parsed = schema.safeParse({
    name: input.name,
    description: input.description?.trim() || null,
    category: null,
    unit: input.unit || "Stk.",
    price_net: Math.round(Number(input.price_net) * 100) / 100,
    vat_rate: Number(input.vat_rate),
    is_favorite: !!input.favorite,
    active: true,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ungültige Leistung." };
  const { data, error } = await db().from("service_catalog").insert(parsed.data).select("id").single();
  if (error || !data) return { error: "Konnte nicht gespeichert werden." };
  revalidatePath("/admin/leistungen");
  return { id: data.id as string };
}

export async function toggleServiceFlag(fd: FormData) {
  await assertFullAccess();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const field = fd.get("field") === "active" ? "active" : "is_favorite";
  const value = fd.get("value") === "true";
  await db().from("service_catalog").update({ [field]: value }).eq("id", id.data);
  revalidatePath("/admin/leistungen");
}

export async function deleteService(fd: FormData) {
  const admin = await assertFullAccess();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const { data } = await db().from("service_catalog").delete().eq("id", id.data).select("name").maybeSingle();
  await logActivity(admin.email, "gelöscht", "leistung", id.data, `Leistung „${data?.name ?? ""}“ gelöscht`);
  revalidatePath("/admin/leistungen");
}
