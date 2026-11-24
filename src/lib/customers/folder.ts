import "server-only";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings/server";
import { joinFolder, monthFolderName, monthFolderPath, normalizeFolder } from "@/lib/files/shared";

type CustomerLike = { id: string; name: string; company_name?: string | null; customer_number?: string | null; folder_path?: string | null; created_at?: string | null };

/** Ordnername aus Firmen- oder Personenname (ohne Schrägstriche) */
export const customerFolderName = (c: CustomerLike) =>
  normalizeFolder(String(c.company_name || c.name || c.customer_number || "Kunde").replace(/\//g, "-"))
    .replace(/\s+/g, " ")
    .slice(0, 80) || "Kunde";

/**
 * Sorgt dafür, dass der Kunde einen eigenen Ordner hat (Kunden/Name + Standard-Unterordner).
 * Übernimmt einen bereits verknüpften Ordner, falls vorhanden. Gibt den Pfad zurück.
 */
export async function ensureCustomerFolder(c: CustomerLike): Promise<string> {
  const client = db();
  if (c.folder_path) {
    const { data } = await client.from("file_folders").select("path").eq("path", c.folder_path).maybeSingle();
    if (data) return c.folder_path;
  }
  // früher verknüpfter Ordner?
  const { data: linked } = await client.from("file_folders").select("path").eq("customer_id", c.id).order("path").limit(1);
  let path = linked?.[0]?.path as string | undefined;
  const s = await getSettings();
  if (!path) {
    const root = normalizeFolder(s.files.customerRoot) || "Kunden";
    // Kunden/2026/11 November/Name – nach dem Monat, in dem der Kunde angelegt wurde
    await ensureYearFolders(new Date(c.created_at ?? Date.now()));
    path = joinFolder(monthFolderPath(root, c.created_at ?? new Date()), customerFolderName(c));
    const { data: taken } = await client.from("file_folders").select("customer_id").eq("path", path).maybeSingle();
    if (taken && taken.customer_id && taken.customer_id !== c.id) path = `${path} (${c.customer_number ?? c.id.slice(0, 6)})`;
    const rows = [path, ...s.files.customerSubfolders.map((sub) => joinFolder(path!, normalizeFolder(sub.replace(/\//g, "-"))))].map((p) => ({ path: p, created_by: "system" }));
    await client.from("file_folders").upsert(rows, { onConflict: "path", ignoreDuplicates: true });
  }
  await client.from("file_folders").update({ customer_id: c.id }).eq("path", path);
  await client.from("customers").update({ folder_path: path }).eq("id", c.id);
  return path;
}

/** Bei Namensänderung den Kundenordner mit umbenennen */
export async function syncCustomerFolderName(c: CustomerLike) {
  if (!c.folder_path) return;
  const target = joinFolder(c.folder_path.split("/").slice(0, -1).join("/"), customerFolderName(c));
  if (target === c.folder_path) return;
  const client = db();
  const { data: exists } = await client.from("file_folders").select("path").eq("path", target).maybeSingle();
  if (exists) return;
  const { error } = await client.rpc("rename_file_folder", { p_old: c.folder_path, p_new: target });
  if (!error) await client.from("customers").update({ folder_path: target }).eq("id", c.id);
}

/** Kategorien mit Farbe */
export async function customerCategories(): Promise<{ name: string; color: string }[]> {
  const { data } = await db().from("customer_categories").select("name, color").order("sort").order("name");
  return (data ?? []) as { name: string; color: string }[];
}

const yearsDone = new Set<string>();

/** Jahresordner mit allen 12 Monaten anlegen (Kunden/2026/01 Januar … 12 Dezember) – schreibt nur, wenn etwas fehlt */
export async function ensureYearFolders(d: Date = new Date()) {
  const s = await getSettings();
  const root = normalizeFolder(s.files.customerRoot) || "Kunden";
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric" }).format(d));
  const memo = `${root}/${year}`;
  if (yearsDone.has(memo)) return;
  const paths = [root, joinFolder(root, String(year)), ...Array.from({ length: 12 }, (_, i) => joinFolder(root, String(year), monthFolderName(i + 1)))];
  const { data } = await db().from("file_folders").select("path").in("path", paths);
  const have = new Set((data ?? []).map((r) => r.path as string));
  const missing = paths.filter((p) => !have.has(p));
  if (missing.length) await db().from("file_folders").upsert(missing.map((path) => ({ path, created_by: "system" })), { onConflict: "path", ignoreDuplicates: true });
  yearsDone.add(memo);
}
