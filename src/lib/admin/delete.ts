import "server-only";
import { db } from "@/lib/supabase/admin";
import { normalizeFolder } from "@/lib/files/shared";
import { idsWhere, putInTrash, rowsWhere, type Snapshot } from "./trash";

/**
 * Löschen mit Papierkorb – jede Funktion speichert zuerst eine Momentaufnahme,
 * löscht dann die Zeilen und gibt die Papierkorb-ID zurück (für „Rückgängig“).
 */
type Row = Record<string, unknown>;
const keysOf = (rows: Row[]) => rows.flatMap((r) => [r.object_key, r.thumb_key, r.preview_key] as (string | null)[]);

async function filesSnapshot(files: Row[]): Promise<Snapshot["inserts"]> {
  const events = await rowsWhere("file_events", "file_id", files.map((f) => String(f.id)));
  return [
    { table: "files", rows: files },
    { table: "file_events", rows: events, dropId: true },
  ];
}

async function deleteIn(table: string, col: string, values: string[]) {
  for (let i = 0; i < values.length; i += 500) await db().from(table).delete().in(col, values.slice(i, i + 500));
}

/** Einzelne Dateien */
export async function trashFiles(ids: string[], actor: string) {
  const files = await rowsWhere("files", "id", ids);
  if (!files.length) return null;
  const snapshot: Snapshot = { inserts: await filesSnapshot(files), relinks: [] };
  const label = files.length === 1 ? String(files[0].name) : `${files.length} Dateien`;
  const folders = [...new Set(files.map((f) => String(f.folder ?? "")))];
  const id = await putInTrash({ kind: "dateien", label, detail: folders.length === 1 ? folders[0] || "Alle Dateien" : `${folders.length} Ordner`, snapshot, objectKeys: keysOf(files), actor });
  await deleteIn("files", "id", files.map((f) => String(f.id)));
  return { id, label, count: files.length };
}

/** Ordner inkl. Unterordner und Dateien */
export async function trashFolder(path: string, actor: string) {
  const folder = normalizeFolder(path);
  if (!folder) return null;
  const client = db();
  const inside = (p: unknown) => p === folder || String(p ?? "").startsWith(`${folder}/`);
  const { data: allFiles } = await client.from("files").select("*").like("folder", `${folder.slice(0, 1)}%`).limit(20000);
  const files = ((allFiles ?? []) as Row[]).filter((f) => inside(f.folder));
  const { data: allFolders } = await client.from("file_folders").select("*").like("path", `${folder.slice(0, 1)}%`).limit(5000);
  const folders = ((allFolders ?? []) as Row[]).filter((f) => inside(f.path));
  const snapshot: Snapshot = { inserts: [{ table: "file_folders", rows: folders, conflict: "path" }, ...(await filesSnapshot(files))], relinks: [] };
  const name = folder.split("/").pop()!;
  const id = await putInTrash({ kind: "ordner", label: name, detail: `${folder} · ${files.length} Datei(en)`, snapshot, objectKeys: keysOf(files), actor });
  await deleteIn("files", "id", files.map((f) => String(f.id)));
  await deleteIn("file_folders", "path", folders.map((f) => String(f.path)));
  return { id, label: name, count: files.length };
}

/** Kunde – auf Wunsch mit seinen Ordnern und Dateien */
export async function trashCustomer(customerId: string, actor: string, withFiles: boolean) {
  const client = db();
  const { data: customer } = await client.from("customers").select("*").eq("id", customerId).maybeSingle();
  if (!customer) return null;
  const [consents, recipients, docs, projects, inquiries, linkedFolders, linkedFiles] = await Promise.all([
    rowsWhere("consent_events", "customer_id", [customerId]),
    rowsWhere("campaign_recipients", "customer_id", [customerId]),
    idsWhere("documents", "customer_id", customerId),
    idsWhere("projects", "customer_id", customerId),
    idsWhere("inquiries", "customer_id", customerId),
    rowsWhere("file_folders", "customer_id", [customerId]),
    rowsWhere("files", "customer_id", [customerId]),
  ]);
  const snapshot: Snapshot = {
    inserts: [
      { table: "customers", rows: [customer] },
      { table: "consent_events", rows: consents, dropId: true },
      { table: "campaign_recipients", rows: recipients, conflict: "campaign_id,customer_id" },
    ],
    relinks: [
      { table: "documents", col: "customer_id", key: "id", values: docs, value: customerId },
      { table: "projects", col: "customer_id", key: "id", values: projects, value: customerId },
      { table: "inquiries", col: "customer_id", key: "id", values: inquiries, value: customerId },
    ],
  };
  let objectKeys: (string | null)[] = [];
  let fileCount = 0;
  if (withFiles) {
    // alle Dateien in den Kundenordnern (inkl. Unterordner) + direkt verknüpfte Dateien
    const roots = linkedFolders.map((f) => String(f.path));
    const inside = (p: unknown) => roots.some((r) => p === r || String(p ?? "").startsWith(`${r}/`));
    const { data: all } = roots.length ? await client.from("files").select("*").limit(20000) : { data: [] };
    const byId = new Map<string, Row>();
    for (const f of [...((all ?? []) as Row[]).filter((f) => inside(f.folder)), ...linkedFiles]) byId.set(String(f.id), f);
    const files = [...byId.values()];
    const { data: allFolders } = roots.length ? await client.from("file_folders").select("*").limit(5000) : { data: [] };
    const folders = ((allFolders ?? []) as Row[]).filter((f) => inside(f.path));
    snapshot.inserts.push({ table: "file_folders", rows: folders, conflict: "path" }, ...(await filesSnapshot(files)));
    objectKeys = keysOf(files);
    fileCount = files.length;
    await deleteIn("files", "id", files.map((f) => String(f.id)));
    await deleteIn("file_folders", "path", folders.map((f) => String(f.path)));
  } else {
    snapshot.relinks.push(
      { table: "file_folders", col: "customer_id", key: "path", values: linkedFolders.map((f) => String(f.path)), value: customerId },
      { table: "files", col: "customer_id", key: "id", values: linkedFiles.map((f) => String(f.id)), value: customerId },
    );
  }
  const label = String(customer.company_name || customer.name || customer.customer_number);
  const id = await putInTrash({ kind: "kunde", label, detail: `${customer.customer_number ?? ""}${withFiles ? ` · mit ${fileCount} Datei(en)` : ""}`, snapshot, objectKeys, actor });
  await client.from("customers").delete().eq("id", customerId);
  return { id, label, count: 1 };
}

export async function trashProject(projectId: string, actor: string) {
  const client = db();
  const { data: p } = await client.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!p) return null;
  const [events, files] = await Promise.all([rowsWhere("project_events", "project_id", [projectId]), idsWhere("files", "project_id", projectId)]);
  const snapshot: Snapshot = {
    inserts: [
      { table: "projects", rows: [p] },
      { table: "project_events", rows: events, dropId: true },
    ],
    relinks: [{ table: "files", col: "project_id", key: "id", values: files, value: projectId }],
  };
  const label = `${p.number} · ${p.title}`;
  const id = await putInTrash({ kind: "auftrag", label, detail: String(p.company_name || p.customer_name || ""), snapshot, actor });
  await client.from("projects").delete().eq("id", projectId);
  return { id, label, count: 1 };
}

export async function trashInquiry(inquiryId: string, actor: string) {
  const client = db();
  const { data: q } = await client.from("inquiries").select("*").eq("id", inquiryId).maybeSingle();
  if (!q) return null;
  const docs = await idsWhere("documents", "inquiry_id", inquiryId);
  const snapshot: Snapshot = { inserts: [{ table: "inquiries", rows: [q] }], relinks: [{ table: "documents", col: "inquiry_id", key: "id", values: docs, value: inquiryId }] };
  const label = `${q.reference} · ${q.name}`;
  const id = await putInTrash({ kind: "anfrage", label, detail: String(q.email ?? ""), snapshot, actor });
  await client.from("inquiries").delete().eq("id", inquiryId);
  return { id, label, count: 1 };
}

/** Angebote und Rechnungs-Entwürfe – festgeschriebene Rechnungen nie (Aufbewahrungspflicht) */
export async function trashDocument(documentId: string, actor: string) {
  const client = db();
  const { data: d } = await client.from("documents").select("*").eq("id", documentId).maybeSingle();
  if (!d) return null;
  if (d.kind === "rechnung" && d.number) return { error: "Festgeschriebene Rechnungen können nicht gelöscht werden – bitte stornieren." };
  const [events, children, projects] = await Promise.all([
    rowsWhere("document_events", "document_id", [documentId]),
    idsWhere("documents", "source_document_id", documentId),
    idsWhere("projects", "offer_id", documentId),
  ]);
  const snapshot: Snapshot = {
    inserts: [
      { table: "documents", rows: [d] },
      { table: "document_events", rows: events, dropId: true },
    ],
    relinks: [
      { table: "documents", col: "source_document_id", key: "id", values: children, value: documentId },
      { table: "projects", col: "offer_id", key: "id", values: projects, value: documentId },
    ],
  };
  const label = `${d.kind === "angebot" ? "Angebot" : "Rechnungsentwurf"} ${d.number ?? "(Entwurf)"} · ${d.customer_name}`;
  const id = await putInTrash({ kind: "dokument", label, detail: String(d.title ?? ""), snapshot, actor });
  await client.from("documents").delete().eq("id", documentId);
  return { id, label, count: 1 };
}
