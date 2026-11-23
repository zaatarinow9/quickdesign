import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security";
import { deleteObject, isR2Configured } from "@/lib/files/r2";

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
  // Abgebrochene Datei-Uploads (älter als 1 Tag) entfernen
  let staleUploads = 0;
  if (isR2Configured()) {
    const { data: stale } = await client.from("files").select("id, object_key").eq("complete", false).lt("created_at", new Date(Date.now() - 864e5).toISOString()).limit(500);
    for (const f of stale ?? []) {
      await deleteObject(f.object_key).catch(() => {});
      await client.from("files").delete().eq("id", f.id);
      staleUploads++;
    }
  }
  // Papierkorb: nach 30 Tagen endgültig löschen (inkl. Speicherobjekte)
  let trashPurged = 0;
  {
    const { data: old } = await client.from("trash_items").select("id, object_keys").lt("deleted_at", new Date(Date.now() - 30 * 864e5).toISOString()).limit(500);
    for (const t of old ?? []) {
      if (isR2Configured()) for (const k of (t.object_keys as string[]) ?? []) await deleteObject(k).catch(() => {});
      await client.from("trash_items").delete().eq("id", t.id);
      trashPurged++;
    }
  }
  return NextResponse.json({ trashPurged, staleUploads, pageViews: views.count ?? 0, rateLimits: limits.count ?? 0, emailLog: emails.count ?? 0, doiReset: doi.error ? "error" : "ok" });
}
