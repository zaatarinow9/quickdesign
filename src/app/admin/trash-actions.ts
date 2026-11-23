"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { assertAdmin, assertFullAccess, hasFullAccess } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";
import { deleteObject } from "@/lib/files/r2";
import { trashCustomer, trashDocument, trashFiles, trashFolder, trashInquiry, trashProject } from "@/lib/admin/delete";
import { restoreFromTrash } from "@/lib/admin/trash";

export type DeleteKind = "datei" | "ordner" | "kunde" | "auftrag" | "anfrage" | "dokument";
export type DeleteResult = { ok?: string; error?: string; trashIds?: string[] };

const uuid = z.uuid();
const refresh = () => revalidatePath("/admin", "layout");

/**
 * Einheitliches Löschen für alle Listen: landet im Papierkorb (30 Tage), „Rückgängig“ über restoreItems.
 * Kunden, Aufträge und Anfragen: nur Inhaber/Administratoren.
 */
export async function deleteItems(input: { kind: DeleteKind; ids: string[]; withFiles?: boolean }): Promise<DeleteResult> {
  const admin = await assertAdmin();
  const actor = admin.name || admin.email;
  const ids = [...new Set(input.ids)].slice(0, 2000);
  if (!ids.length) return { error: "Nichts ausgewählt." };
  if (["kunde", "auftrag", "anfrage"].includes(input.kind) && !hasFullAccess(admin.role)) return { error: "Dafür fehlt die Berechtigung." };
  const trashIds: string[] = [];
  let count = 0;
  const errors: string[] = [];
  try {
    if (input.kind === "datei") {
      if (!ids.every((i) => uuid.safeParse(i).success)) return { error: "Ungültige Auswahl." };
      const r = await trashFiles(ids, actor);
      if (r) (trashIds.push(r.id), (count = r.count));
    } else if (input.kind === "ordner") {
      for (const path of ids) {
        const r = await trashFolder(path, actor);
        if (r) (trashIds.push(r.id), count++);
      }
    } else {
      if (!ids.every((i) => uuid.safeParse(i).success)) return { error: "Ungültige Auswahl." };
      for (const id of ids) {
        const r =
          input.kind === "kunde"
            ? await trashCustomer(id, actor, !!input.withFiles)
            : input.kind === "auftrag"
              ? await trashProject(id, actor)
              : input.kind === "anfrage"
                ? await trashInquiry(id, actor)
                : await trashDocument(id, actor);
        if (!r) continue;
        if ("error" in r) errors.push(r.error!);
        else (trashIds.push(r.id), count++);
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
  after(() => logActivity(admin.email, "gelöscht", input.kind, null, `${count} × ${input.kind} in den Papierkorb`));
  refresh();
  if (!count && errors.length) return { error: errors[0] };
  const word: Record<DeleteKind, [string, string]> = {
    datei: ["Datei", "Dateien"],
    ordner: ["Ordner", "Ordner"],
    kunde: ["Kunde", "Kunden"],
    auftrag: ["Auftrag", "Aufträge"],
    anfrage: ["Anfrage", "Anfragen"],
    dokument: ["Dokument", "Dokumente"],
  };
  return { ok: `${count} ${word[input.kind][count === 1 ? 0 : 1]} gelöscht${errors.length ? ` · ${errors[0]}` : ""}.`, trashIds };
}

export async function restoreItems(ids: string[]): Promise<{ ok?: string; error?: string }> {
  const admin = await assertAdmin();
  const list = z.array(uuid).min(1).max(200).safeParse(ids);
  if (!list.success) return { error: "Ungültig." };
  let n = 0;
  for (const id of list.data) {
    const r = await restoreFromTrash(id);
    if ("error" in r) return { error: r.error };
    n++;
    after(() => logActivity(admin.email, "wiederhergestellt", r.kind, null, r.label));
  }
  refresh();
  return { ok: n === 1 ? "Wiederhergestellt." : `${n} Einträge wiederhergestellt.` };
}

/** Endgültig löschen (auch Speicherobjekte) */
export async function purgeItems(ids: string[] | "alle"): Promise<{ ok?: string; error?: string }> {
  const admin = await assertFullAccess();
  const client = db();
  let q = client.from("trash_items").select("id, object_keys");
  if (ids !== "alle") {
    const list = z.array(uuid).min(1).max(500).safeParse(ids);
    if (!list.success) return { error: "Ungültig." };
    q = q.in("id", list.data);
  }
  const { data } = await q.limit(1000);
  const rows = data ?? [];
  const keys = rows.flatMap((r) => (r.object_keys as string[]) ?? []);
  await client.from("trash_items").delete().in("id", rows.map((r) => r.id));
  after(async () => {
    for (let i = 0; i < keys.length; i += 20) await Promise.all(keys.slice(i, i + 20).map((k) => deleteObject(k).catch(() => {})));
    await logActivity(admin.email, "endgültig gelöscht", "papierkorb", null, `${rows.length} Einträge`);
  });
  refresh();
  return { ok: `${rows.length} Einträge endgültig gelöscht.` };
}
