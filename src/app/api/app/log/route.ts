import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Fehlerberichte der Mitarbeiter-App (nur Text, gekürzt) – landen im Server-Log */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);
    console.error("[app-error]", JSON.stringify({ message: clip(body.message, 500), stack: clip(body.stack, 3000), where: clip(body.where, 100), build: clip(body.build, 20), os: clip(body.os, 40) }));
  } catch {
    /* ungültige Meldung ignorieren */
  }
  return NextResponse.json({ ok: true });
}
