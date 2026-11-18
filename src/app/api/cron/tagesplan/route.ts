import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security";
import { getSettings } from "@/lib/settings/server";
import { mailCompany } from "@/lib/admin/company";
import { addDays, todayBerlin } from "@/lib/documents/format";
import { sendMail } from "@/lib/email/send";
import { dailyPlanEmail } from "@/lib/email/project-templates";
import { adminProjectUrl, listAppointments, logProjectEvent, offerItems, sendAppointmentCustomerMail, teamInbox } from "@/lib/projects/server";
import { formatDayHeading } from "@/lib/projects/shared";

export const maxDuration = 60;

/**
 * Täglicher Job am Vorabend (Vercel Cron):
 *  - Einsatzplan für morgen an Inhaber/Team (Ort, Route, Ansprechpartner, Betrag zum Kassieren)
 *  - Terminerinnerung an Kunden (einmal je Termin)
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.cronSecret || !safeEqual(auth, `Bearer ${env.cronSecret}`)) return new NextResponse("Unauthorized", { status: 401 });

  const settings = await getSettings();
  const today = todayBerlin();
  const tomorrow = addDays(today, 1);
  const list = (await listAppointments(tomorrow, tomorrow)).filter((p) => p.status !== "abgeschlossen");
  const result = { date: tomorrow, appointments: list.length, plan: "übersprungen", reminders: 0, reminderErrors: 0 };

  if (settings.notifications.dailyPlan && list.length) {
    const entries = await Promise.all(list.map(async (p) => ({ project: p, items: await offerItems(p.offer_id), adminUrl: adminProjectUrl(p.id) })));
    const res = await sendMail(
      teamInbox(settings),
      dailyPlanEmail({ siteUrl: env.siteUrl, company: mailCompany(settings), dayLabel: formatDayHeading(tomorrow, today), entries, planUrl: `${env.siteUrl}/admin/projekte` }),
      { kind: "einsatzplan" },
    );
    result.plan = res.ok ? "gesendet" : `fehler: ${res.error}`;
  }

  if (settings.notifications.customerReminder) {
    for (const p of list) {
      if (!p.email || p.customer_reminder_sent_for === tomorrow) continue;
      const res = await sendAppointmentCustomerMail(p, true);
      if (res.ok) {
        result.reminders++;
        await db().from("projects").update({ customer_reminder_sent_for: tomorrow }).eq("id", p.id);
        await logProjectEvent(p.id, "e-mail", "Terminerinnerung an Kunden gesendet", "System");
      } else result.reminderErrors++;
    }
  }

  return NextResponse.json(result);
}
