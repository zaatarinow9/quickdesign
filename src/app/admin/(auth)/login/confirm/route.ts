import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuth } from "@/lib/supabase/server";

/** Einladungs- und Passwort-Links: Token serverseitig prüfen, Sitzung setzen, Passwort festlegen lassen. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || (type !== "invite" && type !== "recovery")) {
    return NextResponse.redirect(new URL("/admin/login?fehler=1", request.url));
  }
  const supabase = await supabaseAuth();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(new URL("/admin/login?fehler=1", request.url));
  return NextResponse.redirect(new URL("/admin/login/passwort", request.url));
}
