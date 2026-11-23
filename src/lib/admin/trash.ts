import "server-only";
import { db } from "@/lib/supabase/admin";

/**
 * Papierkorb: Vor dem Löschen wird eine Momentaufnahme gespeichert.
 *  - inserts: Zeilen, die beim Wiederherstellen wieder eingefügt werden (Reihenfolge beachten)
 *  - relinks: Verweise, die beim Löschen auf NULL gesetzt wurden und wieder verknüpft werden
 * Speicherobjekte (R2) bleiben bis zum endgültigen Löschen erhalten.
 */
export type TrashKind = "dateien" | "ordner" | "kunde" | "auftrag" | "anfrage" | "dokument";
type Row = Record<string, unknown>;
export type Snapshot = {
  inserts: { table: string; rows: Row[]; conflict?: string; dropId?: boolean }[];
  relinks: { table: string; col: string; key: string; values: string[]; value: string }[];
};

export const TRASH_DAYS = 30;

export const trashKindLabel: Record<TrashKind, string> = {
  dateien: "Dateien",
  ordner: "Ordner",
  kunde: "Kunde",
  auftrag: "Auftrag / Termin",
  anfrage: "Anfrage",
  dokument: "Angebot / Entwurf",
};

export async function putInTrash(input: { kind: TrashKind; label: string; detail?: string; snapshot: Snapshot; objectKeys?: (string | null | undefined)[]; actor: string }) {
  const { data, error } = await db()
    .from("trash_items")
    .insert({
      kind: input.kind,
      label: input.label.slice(0, 300),
      detail: input.detail?.slice(0, 500) ?? null,
      snapshot: input.snapshot,
      object_keys: (input.objectKeys ?? []).filter((k): k is string => !!k),
      deleted_by: input.actor,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Papierkorb: ${error.message}`);
  return data.id as string;
}

/** Wiederherstellen: Zeilen einfügen (vorhandene bleiben unangetastet), Verweise neu setzen */
export async function restoreFromTrash(id: string): Promise<{ kind: TrashKind; label: string } | { error: string }> {
  const client = db();
  const { data: item } = await client.from("trash_items").select("*").eq("id", id).maybeSingle();
  if (!item) return { error: "Eintrag nicht mehr im Papierkorb." };
  const snap = item.snapshot as Snapshot;
  for (const ins of snap.inserts) {
    if (!ins.rows.length) continue;
    const rows = ins.dropId ? ins.rows.map(({ id: _drop, ...r }) => r) : ins.rows;
    for (let i = 0; i < rows.length; i += 500) {
      const part = rows.slice(i, i + 500);
      const { error } = ins.dropId
        ? await client.from(ins.table).insert(part)
        : await client.from(ins.table).upsert(part, { onConflict: ins.conflict ?? "id", ignoreDuplicates: true });
      if (error) return { error: `Wiederherstellen fehlgeschlagen (${ins.table}): ${error.message}` };
    }
  }
  for (const r of snap.relinks) {
    if (!r.values.length) continue;
    for (let i = 0; i < r.values.length; i += 500) {
      await client.from(r.table).update({ [r.col]: r.value }).in(r.key, r.values.slice(i, i + 500)).is(r.col, null);
    }
  }
  await client.from("trash_items").delete().eq("id", id);
  return { kind: item.kind as TrashKind, label: item.label as string };
}

/** Zeilen eines Fremdschlüssels sammeln (für Momentaufnahmen) */
export async function rowsWhere(table: string, col: string, values: string[]): Promise<Row[]> {
  if (!values.length) return [];
  const out: Row[] = [];
  for (let i = 0; i < values.length; i += 500) {
    const { data } = await db().from(table).select("*").in(col, values.slice(i, i + 500));
    out.push(...((data ?? []) as Row[]));
  }
  return out;
}
export async function idsWhere(table: string, col: string, value: string, key = "id"): Promise<string[]> {
  const { data } = await db().from(table).select(key).eq(col, value).limit(10000);
  return ((data ?? []) as unknown as Row[]).map((r) => String(r[key]));
}
