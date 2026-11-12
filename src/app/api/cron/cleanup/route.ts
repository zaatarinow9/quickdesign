import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security";

/** Täglicher Job (Vercel Cron): Löschfristen laut Datenschutzerklärung umsetzen. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.cronSecret || !safeEqual(auth, `Bearer ${env.cronSecret}`)) return new NextResponse("Unauthorized", { status: 401 });
  const client = db();
  const monthsAgo = (m: number) => new Date(Date.now() - m * 30.44 * 864e5).toISOString();
  const [views, limits, emails, doi] = await Promise.all([
    // Statistik: 14 Monate
    client.from("page_views").delete({ count: "exact" }).lt("created_at", monthsAgo(14)),
    client.from("rate_limits").delete({ count: "exact" }).lt("window_start", new Date(Date.now() - 2 * 864e5).toISOString()),
    // Versandprotokoll: 24 Monate
    client.from("email_log").delete({ count: "exact" }).lt("created_at", monthsAgo(24)),
    // Nie bestätigte Double-Opt-ins nach 30 Tagen zurücksetzen
    client.from("customers").update({ marketing_status: "keine", doi_token: null }).eq("marketing_status", "ausstehend").lt("doi_sent_at", new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);
  return NextResponse.json({ pageViews: views.count ?? 0, rateLimits: limits.count ?? 0, emailLog: emails.count ?? 0, doiReset: doi.error ? "error" : "ok" });
}
