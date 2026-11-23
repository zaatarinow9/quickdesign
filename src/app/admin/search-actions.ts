"use server";

import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";

export type SearchHit = { group: string; title: string; sub?: string; href: string };

/** Globale Suche (Strg/⌘ + K): Kunden, Dateien, Ordner, Aufträge, Dokumente, Aufmaße, Anfragen */
export async function globalSearch(query: string): Promise<SearchHit[]> {
  await assertAdmin();
  const t = String(query ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 60);
  if (t.length < 2) return [];
  const like = `%${t}%`;
  const c = db();
  const [customers, files, folders, projects, docs, measures, inquiries] = await Promise.all([
    c.from("customers").select("id, name, company_name, customer_number, city").or(`name.ilike.${like},company_name.ilike.${like},customer_number.ilike.${like},email.ilike.${like},phone.ilike.${like},city.ilike.${like}`).limit(6),
    c.from("files").select("id, name, folder").eq("complete", true).ilike("name", like).order("created_at", { ascending: false }).limit(6),
    c.from("file_folders").select("path").ilike("path", like).limit(5),
    c.from("projects").select("id, number, title, customer_name, company_name").or(`number.ilike.${like},title.ilike.${like},customer_name.ilike.${like},company_name.ilike.${like}`).limit(5),
    c.from("documents").select("id, kind, number, title, customer_name, company_name").or(`number.ilike.${like},title.ilike.${like},customer_name.ilike.${like},company_name.ilike.${like}`).limit(5),
    c.from("measurements").select("id, number, title, site_address").or(`number.ilike.${like},title.ilike.${like},site_address.ilike.${like}`).limit(5),
    c.from("inquiries").select("id, reference, name, company_name").or(`reference.ilike.${like},name.ilike.${like},company_name.ilike.${like},email.ilike.${like}`).limit(4),
  ]);
  const hits: SearchHit[] = [];
  for (const r of customers.data ?? []) hits.push({ group: "Kunden", title: r.company_name || r.name, sub: [r.company_name ? r.name : null, r.customer_number, r.city].filter(Boolean).join(" · "), href: `/admin/kunden/${r.id}` });
  for (const r of measures.data ?? []) hits.push({ group: "Aufmaße", title: `${r.number} · ${r.title}`, sub: r.site_address ?? undefined, href: `/admin/aufmass/${r.id}` });
  for (const r of projects.data ?? []) hits.push({ group: "Aufträge", title: `${r.number} · ${r.title}`, sub: r.company_name || r.customer_name || undefined, href: `/admin/projekte/${r.id}` });
  for (const r of docs.data ?? []) hits.push({ group: "Angebote & Rechnungen", title: `${r.kind === "rechnung" ? "Rechnung" : "Angebot"} ${r.number ?? "(Entwurf)"}`, sub: [r.company_name || r.customer_name, r.title].filter(Boolean).join(" · "), href: `/admin/${r.kind === "rechnung" ? "rechnungen" : "angebote"}/${r.id}` });
  for (const r of folders.data ?? []) hits.push({ group: "Ordner", title: String(r.path).split("/").pop()!, sub: r.path, href: `/admin/dateien?ordner=${encodeURIComponent(r.path)}` });
  for (const r of files.data ?? []) hits.push({ group: "Dateien", title: r.name, sub: r.folder || "Alle Dateien", href: `/admin/dateien/${r.id}/ansicht` });
  for (const r of inquiries.data ?? []) hits.push({ group: "Anfragen", title: `${r.reference} · ${r.company_name || r.name}`, href: `/admin/anfragen/${r.id}` });
  return hits;
}
