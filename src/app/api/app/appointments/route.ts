import { AppError, body, route } from "@/lib/app/auth";
import { listAppointments } from "@/lib/appointments/server";
import { saveAppointment } from "@/lib/appointments/save";
import { addDays, todayBerlin } from "@/lib/appointments/shared";

export const dynamic = "force-dynamic";
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/** Termine im Zeitraum – ?from=YYYY-MM-DD&days=14&wer=mich|alle */
export const GET = route(async (req, u) => {
  const sp = new URL(req.url).searchParams;
  const from = dateRe.test(sp.get("from") ?? "") ? sp.get("from")! : todayBerlin();
  const days = Math.min(Math.max(Number(sp.get("days")) || 14, 1), 62);
  const mine = sp.get("wer") !== "alle";
  const items = await listAppointments({ from, to: addDays(from, days), staff: mine ? u.email : undefined, withProjects: !mine });
  return { items, from, days };
});

export const POST = route(async (req, u) => {
  const r = await saveAppointment(await body(req), u.email);
  if (r.error) throw new AppError(400, r.error);
  return r;
});
