import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { getFileRow } from "@/lib/files/server";
import { isR2Configured, presignDownload } from "@/lib/files/r2";

/** Download / Vorschau: prüft die Anmeldung und leitet auf einen kurzlebigen R2-Link um */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", request.url));
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !isR2Configured()) return new NextResponse("Nicht gefunden", { status: 404 });
  const file = await getFileRow(id);
  if (!file || !file.complete) return new NextResponse("Nicht gefunden", { status: 404 });
  const inline = new URL(request.url).searchParams.get("ansicht") === "1";
  const url = await presignDownload(file.object_key, file.name, { inline, seconds: 900 });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}
