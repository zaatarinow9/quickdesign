import { AppError, body, idOf, route } from "@/lib/app/auth";
import { getAppointment } from "@/lib/appointments/server";
import { removeAppointment, saveAppointment, setAppointmentStatus } from "@/lib/appointments/save";
import { teamMembers } from "@/lib/files/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, _u, ctx) => {
  const id = idOf(await ctx.params);
  const [item, team] = await Promise.all([getAppointment(id), teamMembers()]);
  if (!item) throw new AppError(404, "not_found");
  return { item, team };
});

/** Nur Status ändern ({ status }) oder alles speichern (vollständige Felder) */
export const PATCH = route<Ctx>(async (req, u, ctx) => {
  const id = idOf(await ctx.params);
  const b = await body<Record<string, unknown>>(req);
  if (Object.keys(b).length === 1 && typeof b.status === "string") {
    const r = await setAppointmentStatus(id, b.status, u.email);
    if ("error" in r && r.error) throw new AppError(400, r.error);
    return { ok: true };
  }
  const r = await saveAppointment({ ...b, id }, u.email);
  if (r.error) throw new AppError(400, r.error);
  return r;
});

export const DELETE = route<Ctx>(async (_req, _u, ctx) => {
  const id = idOf(await ctx.params);
  const r = await removeAppointment(id);
  if ("error" in r && r.error) throw new AppError(400, r.error);
  return { ok: true };
});
