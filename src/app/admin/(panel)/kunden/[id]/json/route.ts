import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json(null, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json(null, { status: 404 });
  const { data } = await db().from("customers").select("id, salutation, name, company_name, street, postal_code, city, country, email, phone, vat_id").eq("id", id).maybeSingle();
  return data ? NextResponse.json(data, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json(null, { status: 404 });
}
