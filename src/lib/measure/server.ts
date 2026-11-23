import "server-only";
import { db } from "@/lib/supabase/admin";
import { isR2Configured, presignDownload } from "@/lib/files/r2";
import type { MeasureItem, Measurement } from "./shared";

export async function getMeasurement(id: string) {
  const client = db();
  const [{ data: m }, { data: items }] = await Promise.all([
    client.from("measurements").select("*, customer:customers(id, name, company_name, customer_number, phone, street, postal_code, city, folder_path), project:projects(id, number, title)").eq("id", id).maybeSingle(),
    client.from("measurement_items").select("*").eq("measurement_id", id).order("position").order("created_at"),
  ]);
  if (!m) return null;
  const withUrls = await Promise.all(
    ((items ?? []) as MeasureItem[]).map(async (i) => ({
      ...i,
      width_cm: i.width_cm == null ? null : Number(i.width_cm),
      height_cm: i.height_cm == null ? null : Number(i.height_cm),
      photo_url: i.photo_key && isR2Configured() ? await presignDownload(i.photo_key, "foto.jpg", { inline: true, seconds: 6 * 3600, contentType: "image/jpeg" }) : null,
    })),
  );
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? (v[0] ?? null) : v);
  return {
    m: m as Measurement,
    customer: one(m.customer) as { id: string; name: string; company_name: string | null; customer_number: string | null; phone: string | null; street: string | null; postal_code: string | null; city: string | null; folder_path: string | null } | null,
    project: one(m.project) as { id: string; number: string; title: string } | null,
    items: withUrls,
  };
}

export async function listMeasurements(opts: { customerId?: string; q?: string; limit?: number } = {}) {
  let q = db()
    .from("measurements")
    .select("id, number, title, site_address, measured_at, status, customer_id, created_at, customer:customers(id, name, company_name), items:measurement_items(id, width_cm, height_cm, quantity, photo_key)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts.q) {
    const t = opts.q.replace(/[%,()]/g, " ").trim();
    if (t) q = q.or(`number.ilike.%${t}%,title.ilike.%${t}%,site_address.ilike.%${t}%`);
  }
  const { data } = await q;
  return (data ?? []).map((r) => ({
    ...r,
    customer: (Array.isArray(r.customer) ? r.customer[0] : r.customer) as { id: string; name: string; company_name: string | null } | null,
    items: (r.items ?? []) as { id: string; width_cm: number | null; height_cm: number | null; quantity: number; photo_key: string | null }[],
  }));
}
