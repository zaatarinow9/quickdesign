import { getAdmin, hasFullAccess } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { logActivity } from "@/lib/admin/log";

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin || !hasFullAccess(admin.role)) return new Response("Keine Berechtigung", { status: 403 });
  const onlyMarketing = new URL(request.url).searchParams.get("nur") === "werbung";
  let q = db().from("customers").select("*").order("customer_number");
  if (onlyMarketing) q = q.eq("marketing_status", "bestaetigt");
  const { data } = await q.limit(50000);
  const rows = (data ?? []).map((c) => [
    c.customer_number, c.kind, c.status, c.salutation, c.name, c.company_name, c.email, c.phone, c.street, c.postal_code, c.city, c.country, c.vat_id,
    (c.tags ?? []).join(", "), c.source, c.marketing_status, c.marketing_confirmed_at, c.created_at,
  ]);
  await logActivity(admin.email, "export", "kunde", null, `CSV-Export ${onlyMarketing ? "Werbe-Kontakte" : "Kunden"} (${rows.length})`);
  return csvResponse(
    toCsv(["Kundennr.", "Typ", "Status", "Anrede", "Name", "Firma", "E-Mail", "Telefon", "Straße", "PLZ", "Ort", "Land", "USt-IdNr.", "Schlagwörter", "Quelle", "Werbe-Einwilligung", "Bestätigt am", "Angelegt am"], rows),
    `${onlyMarketing ? "werbe-kontakte" : "kunden"}-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
