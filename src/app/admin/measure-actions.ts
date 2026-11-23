"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";
import { putInTrash } from "@/lib/admin/trash";
import { headObject, isR2Configured, presignUpload } from "@/lib/files/r2";
import { ensureCustomerFolder } from "@/lib/customers/folder";
import { joinFolder } from "@/lib/files/shared";
import { getSettings } from "@/lib/settings/server";

const uuid = z.uuid();
const cm = z.number().min(0).max(100000).nullable();
const arrow = z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() }).nullable().optional();
const refresh = (id?: string, customerId?: string | null) => {
  revalidatePath("/admin/aufmass");
  if (id) revalidatePath(`/admin/aufmass/${id}`);
  if (customerId) revalidatePath(`/admin/kunden/${customerId}`);
};

/** Neues Aufmaß – für einen vorhandenen oder schnell angelegten Kunden */
export async function createMeasurement(input: {
  customerId?: string | null;
  newCustomer?: { name: string; company?: string; phone?: string } | null;
  title?: string;
  address?: string;
  date?: string;
}): Promise<{ error?: string } | never> {
  const admin = await assertAdmin();
  const client = db();
  let customerId = input.customerId && uuid.safeParse(input.customerId).success ? input.customerId : null;
  if (!customerId && input.newCustomer?.name?.trim()) {
    const nc = input.newCustomer;
    const { data, error } = await client
      .from("customers")
      .insert({ name: nc.name.trim().slice(0, 160), company_name: nc.company?.trim().slice(0, 160) || null, phone: nc.phone?.trim().slice(0, 60) || null, kind: nc.company ? "firma" : "privat", status: "lead", source: "aufmass", created_by: admin.email })
      .select("id, name, company_name, customer_number, created_at")
      .single();
    if (error || !data) return { error: "Kunde konnte nicht angelegt werden." };
    customerId = data.id;
    await ensureCustomerFolder(data);
  }
  let address = input.address?.trim().slice(0, 300) || null;
  if (!address && customerId) {
    const { data: c } = await client.from("customers").select("street, postal_code, city").eq("id", customerId).maybeSingle();
    if (c) address = [c.street, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;
  }
  const { data: num } = await client.rpc("next_measurement_number");
  const { data, error } = await client
    .from("measurements")
    .insert({
      number: num as string,
      customer_id: customerId,
      title: input.title?.trim().slice(0, 200) || "Aufmaß",
      site_address: address,
      measured_at: /^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "") ? input.date : undefined,
      created_by: admin.name || admin.email,
    })
    .select("id, number")
    .single();
  if (error || !data) return { error: "Aufmaß konnte nicht angelegt werden." };
  after(() => logActivity(admin.email, "erstellt", "aufmass", customerId, `Aufmaß ${data.number} angelegt`));
  refresh(undefined, customerId);
  redirect(`/admin/aufmass/${data.id}`);
}

export async function updateMeasurement(input: { id: string; title?: string; address?: string | null; date?: string; status?: "offen" | "fertig"; notes?: string | null; customerId?: string | null }) {
  await assertAdmin();
  if (!uuid.safeParse(input.id).success) return { error: "Ungültig." };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim().slice(0, 200) || "Aufmaß";
  if (input.address !== undefined) patch.site_address = input.address?.trim().slice(0, 300) || null;
  if (input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) patch.measured_at = input.date;
  if (input.status) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes?.trim().slice(0, 4000) || null;
  if (input.customerId !== undefined) patch.customer_id = input.customerId && uuid.safeParse(input.customerId).success ? input.customerId : null;
  const { data } = await db().from("measurements").update(patch).eq("id", input.id).select("customer_id").maybeSingle();
  refresh(input.id, data?.customer_id);
  return { ok: "Gespeichert." };
}

/** Upload-Link für ein Foto (direkt vom Handy zu R2) */
export async function measurePhotoUpload(measurementId: string, kind: "foto" | "markiert"): Promise<{ key?: string; url?: string; error?: string }> {
  await assertAdmin();
  if (!uuid.safeParse(measurementId).success || !isR2Configured()) return { error: "Speicher nicht verbunden." };
  const key = `aufmass/${measurementId}/${crypto.randomUUID()}${kind === "markiert" ? "-markiert" : ""}.jpg`;
  return { key, url: await presignUpload(key, "image/jpeg", 900) };
}

const itemSchema = z.object({
  measurementId: uuid,
  id: uuid.optional(),
  label: z.string().trim().max(120),
  width: cm,
  height: cm,
  quantity: z.number().int().min(1).max(10000),
  material: z.string().trim().max(200).nullable(),
  notes: z.string().trim().max(4000).nullable(),
  photo: z.object({ key: z.string().max(300), width: z.number().int().positive(), height: z.number().int().positive() }).nullable().optional(),
  arrows: z.object({ w: arrow, h: arrow }).nullable(),
  markedKey: z.string().max(300).nullable().optional(),
});

/** Position speichern; das markierte Foto landet zusätzlich im Kundenordner */
export async function saveMeasureItem(input: z.input<typeof itemSchema>): Promise<{ id?: string; error?: string }> {
  const admin = await assertAdmin();
  const p = itemSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const d = p.data;
  const client = db();
  const keyOk = (k?: string | null) => !k || k.startsWith(`aufmass/${d.measurementId}/`);
  if (!keyOk(d.photo?.key) || !keyOk(d.markedKey)) return { error: "Ungültiges Foto." };
  const row: Record<string, unknown> = {
    measurement_id: d.measurementId,
    label: d.label,
    width_cm: d.width,
    height_cm: d.height,
    quantity: d.quantity,
    material: d.material || null,
    notes: d.notes || null,
    arrows: d.arrows,
    updated_at: new Date().toISOString(),
  };
  if (d.photo !== undefined) Object.assign(row, { photo_key: d.photo?.key ?? null, photo_width: d.photo?.width ?? null, photo_height: d.photo?.height ?? null });
  if (d.markedKey !== undefined) row.marked_key = d.markedKey;
  let id = d.id;
  if (id) {
    const { error } = await client.from("measurement_items").update(row).eq("id", id).eq("measurement_id", d.measurementId);
    if (error) return { error: "Speichern fehlgeschlagen." };
  } else {
    const { count } = await client.from("measurement_items").select("id", { count: "exact", head: true }).eq("measurement_id", d.measurementId);
    const { data, error } = await client.from("measurement_items").insert({ ...row, position: (count ?? 0) + 1 }).select("id").single();
    if (error || !data) return { error: "Speichern fehlgeschlagen." };
    id = data.id;
  }
  await client.from("measurements").update({ updated_at: new Date().toISOString() }).eq("id", d.measurementId);
  // Markiertes Foto im Kundenordner ablegen (Aufmaß & Fotos/AM-…)
  if (d.markedKey) {
    const markedKey = d.markedKey;
    const itemId = id!;
    after(async () => {
      const { data: m } = await client.from("measurements").select("number, customer_id, customer:customers(id, name, company_name, customer_number, folder_path, created_at)").eq("id", d.measurementId).maybeSingle();
      const cust = m && (Array.isArray(m.customer) ? m.customer[0] : m.customer);
      if (!m || !cust) return;
      const root = await ensureCustomerFolder(cust as never);
      const s = await getSettings();
      const sub = s.files.customerSubfolders.find((f) => /aufma/i.test(f)) ?? "Aufmaß & Fotos";
      const folder = joinFolder(root, sub, m.number as string);
      await client.from("file_folders").upsert([{ path: joinFolder(root, sub), created_by: "system" }, { path: folder, created_by: "system" }], { onConflict: "path", ignoreDuplicates: true });
      const head = await headObject(markedKey).catch(() => null);
      const { data: it } = await client.from("measurement_items").select("position, label").eq("id", itemId).maybeSingle();
      const name = `${String(it?.position ?? 1).padStart(2, "0")} ${(it?.label || "Position").replace(/[\\/]/g, "-")}.jpg`;
      // vorherige Version dieser Position ersetzen
      await client.from("files").delete().eq("folder", folder).eq("name", name);
      await client.from("files").insert({
        object_key: markedKey,
        name,
        size: head?.size ?? 0,
        content_type: "image/jpeg",
        folder,
        customer_id: cust.id,
        status: "neu",
        uploaded_by: admin.name || admin.email,
        complete: true,
        message: `Aufmaß ${m.number}`,
      });
    });
  }
  refresh(d.measurementId);
  return { id };
}

export async function deleteMeasureItem(id: string) {
  await assertAdmin();
  if (!uuid.safeParse(id).success) return { error: "Ungültig." };
  const { data } = await db().from("measurement_items").delete().eq("id", id).select("measurement_id").maybeSingle();
  if (data) refresh(data.measurement_id);
  return { ok: "Position gelöscht." };
}

export async function reorderMeasureItems(measurementId: string, ids: string[]) {
  await assertAdmin();
  if (!uuid.safeParse(measurementId).success) return;
  await Promise.all(ids.filter((i) => uuid.safeParse(i).success).map((id, i) => db().from("measurement_items").update({ position: i + 1 }).eq("id", id).eq("measurement_id", measurementId)));
  refresh(measurementId);
}

/** Aufmaß in den Papierkorb */
export async function deleteMeasurement(id: string): Promise<{ ok?: string; error?: string; trashIds?: string[] }> {
  const admin = await assertAdmin();
  if (!uuid.safeParse(id).success) return { error: "Ungültig." };
  const client = db();
  const [{ data: m }, { data: items }] = await Promise.all([client.from("measurements").select("*").eq("id", id).maybeSingle(), client.from("measurement_items").select("*").eq("measurement_id", id)]);
  if (!m) return { error: "Nicht gefunden." };
  const trashId = await putInTrash({
    kind: "aufmass",
    label: `${m.number} · ${m.title}`,
    detail: `${items?.length ?? 0} Position(en)`,
    snapshot: { inserts: [{ table: "measurements", rows: [m] }, { table: "measurement_items", rows: items ?? [] }], relinks: [] },
    objectKeys: (items ?? []).map((i) => i.photo_key as string | null),
    actor: admin.name || admin.email,
  });
  await client.from("measurements").delete().eq("id", id);
  refresh(undefined, m.customer_id);
  return { ok: `Aufmaß ${m.number} gelöscht.`, trashIds: [trashId] };
}
