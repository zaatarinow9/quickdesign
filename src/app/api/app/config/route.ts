import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Öffentliche Startwerte für die Mitarbeiter-App – nur Werte, die ohnehin
 * öffentlich sind (Supabase-URL und Publishable Key). So steht kein Schlüssel im App-Code.
 */
export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  return NextResponse.json({ supabaseUrl, supabaseKey, minBuild: 1 }, { headers: { "cache-control": "public, max-age=300" } });
}
