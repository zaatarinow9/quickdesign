import { NextResponse } from "next/server";
import { isToken } from "@/lib/security";
import { unsubscribeByToken } from "@/lib/marketing/server";

/** One-Click-Abmeldung (RFC 8058, List-Unsubscribe-Post) */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!isToken(token)) return new NextResponse(null, { status: 400 });
  await unsubscribeByToken(token, "one_click");
  return new NextResponse(null, { status: 200 });
}
