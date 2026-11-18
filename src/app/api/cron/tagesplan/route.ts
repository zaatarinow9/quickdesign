import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security";
import { getSettings } from "@/lib/settings/server";
import { addDays, todayBerlin } from "@/lib/documents/format";
import { dayTasks, logProjectEvent, planSentDates, sendAppointmentCustomerMail, sendDayPlan } from "@/lib/projects/server";

export const maxDuration = 60;

const berlinHour = () => Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" }).format(new Date()));

/**
 * Täglich um 18 Uhr (Europe/Berlin) – Vercel ruft den Job zweimal auf (16 und 17 Uhr UTC),
 * damit Sommer- und Winterzeit abgedeckt sind; gesendet wird nur einmal pro Tag:
 *  - EIN Einsatzplan mit allen Aufgaben für morgen (nummeriert) an die Mitarbeiter
 *  - Terminerinnerung an Kunden (einmal je Termin)
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.cronSecret || !safeEqual(auth, `Bearer ${env.cronSecret}`)) return new NextResponse("Unauthorized", { status: 401 });

  const hour = berlinHour();
  if (hour < 18) return NextResponse.json({ skipped: `zu früh (${hour} Uhr Berlin)` });

  const settings = await getSettings();
  const today = todayBerlin();
  const tomorrow = addDays(today, 1);
  const result: Record<string, unknown> = { date: tomorrow };

  if (settings.notifications.dailyPlan) {
    if ((await planSentDates([tomorrow])).length) result.plan = "bereits gesendet";
    else {
      const res = await sendDayPlan(tomorrow, { today });
      result.plan = res.message;
    }
  }

  if (settings.notifications.customerReminder) {
    let reminders = 0;
    for (const p of await dayTasks(tomorrow)) {
      if (!p.email || p.kind === "aufgabe" || p.customer_reminder_sent_for === tomorrow) continue;
      const res = await sendAppointmentCustomerMail(p, true);
      if (res.ok) {
        reminders++;
        await db().from("projects").update({ customer_reminder_sent_for: tomorrow }).eq("id", p.id);
        await logProjectEvent(p.id, "e-mail", "Terminerinnerung an Kunden gesendet", "System");
      }
    }
    result.reminders = reminders;
  }
  return NextResponse.json(result);
}
