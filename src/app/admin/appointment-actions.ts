"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { removeAppointment, saveAppointment, setAppointmentStatus, type AppointmentInput } from "@/lib/appointments/save";

const refresh = () => revalidatePath("/admin", "layout");

export async function saveAppointmentAction(input: AppointmentInput) {
  const admin = await assertAdmin();
  const r = await saveAppointment(input, admin.email);
  if (r.id) refresh();
  return r;
}

export async function setAppointmentStatusAction(id: string, status: string) {
  const admin = await assertAdmin();
  const r = await setAppointmentStatus(id, status, admin.email);
  refresh();
  return r;
}

export async function deleteAppointmentAction(id: string) {
  await assertAdmin();
  const r = await removeAppointment(id);
  refresh();
  return r;
}
