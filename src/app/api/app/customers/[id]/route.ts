import { AppError, idOf, route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, u, ctx) => {
  const id = idOf(await ctx.params);
  const { data } = await db()
    .from("customers")
    .select("id, customer_number, kind, status, salutation, name, company_name, email, phone, street, postal_code, city, country, vat_id, website, tags, notes, source, created_at, last_contact_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) throw new AppError(404, "not_found");
  const [docs, projects, inquiries] = await Promise.all([
    db().from("documents").select("id, kind, number, status, title, gross_total, paid_amount, doc_date").eq("customer_id", id).order("doc_date", { ascending: false }).limit(50),
    db().from("projects").select("id, number, title, status, kind, appointment_date").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    db().from("inquiries").select("id, reference, status, created_at, message").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  return {
    item: data,
    documents: (docs.data ?? []).map((d) => (u.full ? d : { ...d, gross_total: null, paid_amount: null })),
    projects: projects.data ?? [],
    inquiries: inquiries.data ?? [],
  };
});
