import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { clientIpHash, isSameOrigin, rateLimit } from "@/lib/security";

const schema = z.object({
  path: z.string().startsWith("/").max(300),
  vid: z.string().regex(/^[a-f0-9]{8,40}$/).nullable().optional(),
  ref: z.string().max(200).nullable().optional(),
  utm_source: z.string().max(100).nullable().optional(),
  utm_medium: z.string().max(100).nullable().optional(),
  utm_campaign: z.string().max(150).nullable().optional(),
  device: z.enum(["mobil", "tablet", "desktop"]).optional(),
});

/** Seitenaufruf speichern (nur nach Einwilligung vom Browser gesendet; keine IP-Speicherung). */
export async function POST(request: Request) {
  if (!env.databaseConfigured || !(await isSameOrigin())) return new NextResponse(null, { status: 204 });
  if (request.headers.get("sec-gpc") === "1") return new NextResponse(null, { status: 204 });
  const ua = request.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|preview|headless/i.test(ua)) return new NextResponse(null, { status: 204 });
  if (!(await rateLimit(`track:${await clientIpHash()}`, 120, 600))) return new NextResponse(null, { status: 204 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.path.startsWith("/admin")) return new NextResponse(null, { status: 204 });
  const d = parsed.data;
  await db().from("page_views").insert({
    visitor_id: d.vid ?? null,
    path: d.path.split("?")[0],
    referrer_host: d.ref ?? null,
    utm_source: d.utm_source ?? null,
    utm_medium: d.utm_medium ?? null,
    utm_campaign: d.utm_campaign ?? null,
    device: d.device ?? null,
  });
  return new NextResponse(null, { status: 204 });
}
