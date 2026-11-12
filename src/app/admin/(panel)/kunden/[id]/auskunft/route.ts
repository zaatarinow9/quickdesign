import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";

/** Auskunft nach Art. 15 DSGVO: alle gespeicherten Daten zu einem Kunden als JSON */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return new NextResponse("Nicht angemeldet", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Nicht gefunden", { status: 404 });
  const client = db();
  const [{ data: customer }, { data: inquiries }, { data: documents }, { data: consents }] = await Promise.all([
    client.from("customers").select("*").eq("id", id).maybeSingle(),
    client.from("inquiries").select("reference, status, name, company_name, email, phone, message, interests, utm, marketing_opt_in, created_at").eq("customer_id", id),
    client.from("documents").select("kind, number, status, title, doc_date, gross_total, items, accepted_at, accepted_name").eq("customer_id", id),
    client.from("consent_events").select("action, source, consent_text, text_version, created_at").eq("customer_id", id),
  ]);
  if (!customer) return new NextResponse("Nicht gefunden", { status: 404 });
  const { doi_token: _d, unsubscribe_token: _u, ...profile } = customer; // eslint-disable-line @typescript-eslint/no-unused-vars
  await logActivity(admin.email, "auskunft", "kunde", id, `Datenauskunft ${customer.customer_number} erstellt`);
  const body = JSON.stringify({ erstellt_am: new Date().toISOString(), verantwortlicher: "QuickDesign", kunde: profile, anfragen: inquiries, dokumente: documents, einwilligungen: consents }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datenauskunft-${customer.customer_number}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
