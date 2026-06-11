"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission, requireAdminUser } from "@/lib/admin/auth";
import { canManageAppointmentRecord } from "@/lib/appointments/access";
import { sendDueAppointmentReminders } from "@/lib/appointments/reminders";
import { prisma } from "@/lib/prisma";
import { prismaWithAppointmentModels } from "@/lib/prisma-appointments";

type AppointmentRelations = {
  customerId: string | null;
  orderId: string | null;
  assignedUserId: string | null;
};

type AppointmentStatusValue =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: string): string | null {
  return value ? value : null;
}

function normalizeDateTimeInput(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeAppointmentStatus(value: string): AppointmentStatusValue {
  switch (value) {
    case "COMPLETED":
    case "CANCELLED":
    case "NO_SHOW":
      return value;
    case "SCHEDULED":
    default:
      return "SCHEDULED";
  }
}

function buildAppointmentRedirectPath(input: {
  appointmentId?: string;
  fallback?: string;
  params?: Record<string, string | number | null | undefined>;
}): string {
  const basePath =
    input.fallback ??
    (input.appointmentId ? `/admin/appointments/${input.appointmentId}` : "/admin/appointments");

  const searchParams = new URLSearchParams();

  Object.entries(input.params ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

async function addOrderActivityIfNeeded(input: {
  orderId: string | null;
  adminUserId: string;
  type: string;
  message: string;
}): Promise<void> {
  if (!input.orderId) {
    return;
  }

  await prisma.orderActivity.create({
    data: {
      orderId: input.orderId,
      adminUserId: input.adminUserId,
      type: input.type,
      message: input.message,
    },
  });
}

function shouldResetReminderSentAt(input: {
  currentReminderAt: Date | null;
  nextReminderAt: Date | null;
  currentAssignedUserId: string | null;
  nextAssignedUserId: string | null;
  currentStartAt: Date;
  nextStartAt: Date;
  currentTitle: string;
  nextTitle: string;
  currentLocation: string | null;
  nextLocation: string | null;
  currentNotes: string | null;
  nextNotes: string | null;
}): boolean {
  if (!input.nextReminderAt) {
    return true;
  }

  if (!input.currentReminderAt) {
    return true;
  }

  return (
    input.currentReminderAt.getTime() !== input.nextReminderAt.getTime() ||
    input.currentAssignedUserId !== input.nextAssignedUserId ||
    input.currentStartAt.getTime() !== input.nextStartAt.getTime() ||
    input.currentTitle !== input.nextTitle ||
    input.currentLocation !== input.nextLocation ||
    input.currentNotes !== input.nextNotes
  );
}

async function resolveAppointmentRelations(input: {
  customerId: string | null;
  orderId: string | null;
  assignedUserId: string | null;
}): Promise<AppointmentRelations | null> {
  const order = input.orderId
    ? await prisma.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          customerId: true,
        },
      })
    : null;

  if (input.orderId && !order) {
    return null;
  }

  const customerId = order?.customerId ?? input.customerId;

  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return null;
    }
  }

  if (input.assignedUserId) {
    const assignedUser = await prisma.adminUser.findFirst({
      where: {
        id: input.assignedUserId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!assignedUser) {
      return null;
    }
  }

  return {
    customerId,
    orderId: order?.id ?? null,
    assignedUserId: input.assignedUserId,
  };
}

function revalidateAppointmentPaths(appointmentId: string, related: {
  customerId: string | null;
  orderId: string | null;
}): void {
  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${appointmentId}`);

  if (related.customerId) {
    revalidatePath(`/admin/customers/${related.customerId}`);
  }

  if (related.orderId) {
    revalidatePath(`/admin/orders/${related.orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/reports");
  }
}

export async function createAppointment(formData: FormData): Promise<void> {
  const currentUser = await requireAdminPermission("canManageAppointments");
  const title = getFormString(formData, "title");
  const description = normalizeOptionalString(getFormString(formData, "description"));
  const startAt = normalizeDateTimeInput(getFormString(formData, "startAt"));
  const endAt = normalizeDateTimeInput(getFormString(formData, "endAt"));
  const reminderAt = normalizeDateTimeInput(getFormString(formData, "reminderAt"));
  const location = normalizeOptionalString(getFormString(formData, "location"));
  const notes = normalizeOptionalString(getFormString(formData, "notes"));
  const relations = await resolveAppointmentRelations({
    customerId: normalizeOptionalString(getFormString(formData, "customerId")),
    orderId: normalizeOptionalString(getFormString(formData, "orderId")),
    assignedUserId: normalizeOptionalString(getFormString(formData, "assignedUserId")),
  });

  if (!title || !startAt || !relations) {
    redirect(buildAppointmentRedirectPath({ fallback: "/admin/appointments", params: { error: "invalid" } }));
  }

  const appointment = await prismaWithAppointmentModels.appointment.create<{
    id: string;
    orderId: string | null;
  }>({
    data: {
      title,
      description,
      startAt,
      endAt,
      reminderAt,
      reminderSentAt: null,
      customerId: relations.customerId,
      orderId: relations.orderId,
      assignedUserId: relations.assignedUserId,
      createdById: currentUser.id,
      location,
      notes,
    },
    select: {
      id: true,
      orderId: true,
    },
  });

  await addOrderActivityIfNeeded({
    orderId: appointment.orderId,
    adminUserId: currentUser.id,
    type: "APPOINTMENT_CREATED",
    message: `${currentUser.name} hat den Termin "${title}" erstellt.`,
  });

  revalidateAppointmentPaths(appointment.id, relations);
  redirect(
    buildAppointmentRedirectPath({
      appointmentId: appointment.id,
      params: { created: 1 },
    }),
  );
}

export async function updateAppointment(formData: FormData): Promise<void> {
  const currentUser = await requireAdminUser();
  const appointmentId = getFormString(formData, "appointmentId");
  const appointment = await prismaWithAppointmentModels.appointment.findUnique<{
    id: string;
    title: string;
    startAt: Date;
    reminderAt: Date | null;
    assignedUserId: string | null;
    location: string | null;
    notes: string | null;
    orderId: string | null;
    customerId: string | null;
  }>({
    where: { id: appointmentId },
    select: {
      id: true,
      title: true,
      startAt: true,
      reminderAt: true,
      assignedUserId: true,
      location: true,
      notes: true,
      orderId: true,
      customerId: true,
    },
  });

  if (!appointment) {
    redirect("/admin/appointments");
  }

  if (!canManageAppointmentRecord(currentUser)) {
    redirect(
      buildAppointmentRedirectPath({
        appointmentId,
        params: { forbidden: 1 },
      }),
    );
  }

  const title = getFormString(formData, "title");
  const description = normalizeOptionalString(getFormString(formData, "description"));
  const startAt = normalizeDateTimeInput(getFormString(formData, "startAt"));
  const endAt = normalizeDateTimeInput(getFormString(formData, "endAt"));
  const reminderAt = normalizeDateTimeInput(getFormString(formData, "reminderAt"));
  const location = normalizeOptionalString(getFormString(formData, "location"));
  const notes = normalizeOptionalString(getFormString(formData, "notes"));
  const status = normalizeAppointmentStatus(getFormString(formData, "status"));
  const relations = await resolveAppointmentRelations({
    customerId: normalizeOptionalString(getFormString(formData, "customerId")),
    orderId: normalizeOptionalString(getFormString(formData, "orderId")),
    assignedUserId: normalizeOptionalString(getFormString(formData, "assignedUserId")),
  });

  if (!title || !startAt || !relations) {
    redirect(
      buildAppointmentRedirectPath({
        appointmentId,
        params: { error: "invalid" },
      }),
    );
  }

  const resetReminderSentAt = shouldResetReminderSentAt({
    currentReminderAt: appointment.reminderAt,
    nextReminderAt: reminderAt,
    currentAssignedUserId: appointment.assignedUserId,
    nextAssignedUserId: relations.assignedUserId,
    currentStartAt: appointment.startAt,
    nextStartAt: startAt,
    currentTitle: appointment.title,
    nextTitle: title,
    currentLocation: appointment.location,
    nextLocation: location,
    currentNotes: appointment.notes,
    nextNotes: notes,
  });

  await prismaWithAppointmentModels.appointment.update({
    where: { id: appointmentId },
    data: {
      title,
      description,
      status,
      startAt,
      endAt,
      reminderAt,
      reminderSentAt: resetReminderSentAt ? null : undefined,
      customerId: relations.customerId,
      orderId: relations.orderId,
      assignedUserId: relations.assignedUserId,
      location,
      notes,
    },
  });

  await addOrderActivityIfNeeded({
    orderId: relations.orderId,
    adminUserId: currentUser.id,
    type: "APPOINTMENT_UPDATED",
    message: `${currentUser.name} hat den Termin "${title}" aktualisiert.`,
  });

  revalidateAppointmentPaths(appointmentId, {
    customerId: appointment.customerId,
    orderId: appointment.orderId,
  });
  revalidateAppointmentPaths(appointmentId, relations);
  redirect(
    buildAppointmentRedirectPath({
      appointmentId,
      params: { updated: 1 },
    }),
  );
}

export async function updateAppointmentStatus(formData: FormData): Promise<void> {
  const currentUser = await requireAdminUser();
  const appointmentId = getFormString(formData, "appointmentId");
  const status = normalizeAppointmentStatus(getFormString(formData, "status"));
  const returnTo = normalizeOptionalString(getFormString(formData, "returnTo"));
  const appointment = await prismaWithAppointmentModels.appointment.findUnique<{
    id: string;
    title: string;
    orderId: string | null;
    customerId: string | null;
    endAt: Date | null;
  }>({
    where: { id: appointmentId },
    select: {
      id: true,
      title: true,
      orderId: true,
      customerId: true,
      endAt: true,
    },
  });

  if (!appointment) {
    redirect("/admin/appointments");
  }

  if (!canManageAppointmentRecord(currentUser)) {
    redirect(
      buildAppointmentRedirectPath({
        appointmentId,
        fallback: returnTo ?? undefined,
        params: { forbidden: 1 },
      }),
    );
  }

  await prismaWithAppointmentModels.appointment.update({
    where: { id: appointmentId },
    data: {
      status,
      endAt:
        status === "COMPLETED" && !appointment.endAt ? new Date() : appointment.endAt,
    },
  });

  await addOrderActivityIfNeeded({
    orderId: appointment.orderId,
    adminUserId: currentUser.id,
    type: "APPOINTMENT_STATUS_UPDATED",
    message: `${currentUser.name} hat den Termin "${appointment.title}" auf ${status} gesetzt.`,
  });

  revalidateAppointmentPaths(appointmentId, {
    customerId: appointment.customerId,
    orderId: appointment.orderId,
  });
  redirect(
    buildAppointmentRedirectPath({
      appointmentId,
      fallback: returnTo ?? undefined,
      params: { statusChanged: 1 },
    }),
  );
}

export async function runAppointmentReminderCheck(): Promise<void> {
  await requireAdminPermission("canManageAppointments");
  const result = await sendDueAppointmentReminders();

  revalidatePath("/admin/appointments");
  result.sentAppointmentIds.forEach((appointmentId) => {
    revalidatePath(`/admin/appointments/${appointmentId}`);
  });

  redirect(
    buildAppointmentRedirectPath({
      fallback: "/admin/appointments",
      params: {
        reminderCheck: 1,
        sent: result.sentCount,
        skipped: result.skippedCount,
        failed: result.failedCount,
      },
    }),
  );
}
