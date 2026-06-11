import { NextResponse } from "next/server";
import { sendDueAppointmentReminders } from "@/lib/appointments/reminders";

function isAuthorized(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  const authorizationHeader = request.headers.get("authorization");

  if (!configuredSecret || !authorizationHeader) {
    return false;
  }

  return authorizationHeader === `Bearer ${configuredSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendDueAppointmentReminders();

  return NextResponse.json({
    ok: true,
    dueCount: result.dueCount,
    sentCount: result.sentCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
    warnings: result.warnings,
  });
}
