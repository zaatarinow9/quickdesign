import "server-only";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings/server";
import { joinFolder, normalizeFolder } from "@/lib/files/shared";

type CustomerLike = { id: string; name: string; company_name?: string | null; customer_number?: string | null; folder_path?: string | null };

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
    path = joinFolder(root, customerFolderName(c));
    const { data: taken } = await client.from("file_folders").select("customer_id").eq("path", path).maybeSingle();
    if (taken && taken.customer_id && taken.customer_id !== c.id) path = `${path} (${c.customer_number ?? c.id.slice(0, 6)})`;
    const rows = [root, path, ...s.files.customerSubfolders.map((sub) => joinFolder(path!, normalizeFolder(sub.replace(/\//g, "-"))))].map((p) => ({ path: p, created_by: "system" }));
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
