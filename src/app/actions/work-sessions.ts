"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin/auth";
import {
  canManageWorkSessionRecord,
  canStartWorkSessionForContext,
} from "@/lib/appointments/access";
import { calculateWorkSessionDurationMinutes } from "@/lib/appointments/format";
import { prisma } from "@/lib/prisma";
import { prismaWithAppointmentModels } from "@/lib/prisma-appointments";

type SessionContext = {
  appointmentId: string | null;
  appointmentTitle: string | null;
  orderId: string | null;
  orderNumber: number | null;
  customerId: string | null;
  orderAssignedUserId: string | null;
  appointmentAssignedUserId: string | null;
};

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: string): string | null {
  return value ? value : null;
}

function buildSessionRedirectPath(input: {
  returnTo?: string | null;
  params?: Record<string, string | number | null | undefined>;
}): string {
  const basePath = input.returnTo || "/admin/appointments";
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

async function resolveSessionContext(formData: FormData): Promise<SessionContext | null> {
  const requestedAppointmentId = normalizeOptionalString(
    getFormString(formData, "appointmentId"),
  );
  const requestedOrderId = normalizeOptionalString(getFormString(formData, "orderId"));
  const requestedCustomerId = normalizeOptionalString(
    getFormString(formData, "customerId"),
  );

  const appointment = requestedAppointmentId
    ? await prismaWithAppointmentModels.appointment.findUnique<{
        id: string;
        title: string;
        assignedUserId: string | null;
        orderId: string | null;
        customerId: string | null;
      }>({
        where: { id: requestedAppointmentId },
        select: {
          id: true,
          title: true,
          assignedUserId: true,
          orderId: true,
          customerId: true,
        },
      })
    : null;

  if (requestedAppointmentId && !appointment) {
    return null;
  }

  const resolvedOrderId = appointment?.orderId ?? requestedOrderId;
  const order = resolvedOrderId
    ? await prisma.order.findUnique({
        where: { id: resolvedOrderId },
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          assignedToId: true,
        },
      })
    : null;

  if (resolvedOrderId && !order) {
    return null;
  }

  const resolvedCustomerId =
    order?.customerId ?? appointment?.customerId ?? requestedCustomerId;

  if (resolvedCustomerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: resolvedCustomerId },
      select: { id: true },
    });

    if (!customer) {
      return null;
    }
  }

  return {
    appointmentId: appointment?.id ?? null,
    appointmentTitle: appointment?.title ?? null,
    orderId: order?.id ?? null,
    orderNumber: order?.orderNumber ?? null,
    customerId: resolvedCustomerId,
    orderAssignedUserId: order?.assignedToId ?? null,
    appointmentAssignedUserId: appointment?.assignedUserId ?? null,
  };
}

function revalidateSessionPaths(context: SessionContext): void {
  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/orders");

  if (context.appointmentId) {
    revalidatePath(`/admin/appointments/${context.appointmentId}`);
  }

  if (context.orderId) {
    revalidatePath(`/admin/orders/${context.orderId}`);
  }

  if (context.customerId) {
    revalidatePath(`/admin/customers/${context.customerId}`);
  }
}

function deriveWorkSessionTitle(input: {
  explicitTitle: string | null;
  appointmentTitle: string | null;
  orderNumber: number | null;
}): string | null {
  if (input.explicitTitle) {
    return input.explicitTitle;
  }

  if (input.appointmentTitle) {
    return input.appointmentTitle;
  }

  if (input.orderNumber !== null) {
    return `Arbeitszeit Auftrag #${input.orderNumber}`;
  }

  return null;
}

export async function startWorkSession(formData: FormData): Promise<void> {
  const currentUser = await requireAdminUser();
  const returnTo = normalizeOptionalString(getFormString(formData, "returnTo"));
  const notes = normalizeOptionalString(getFormString(formData, "notes"));
  const context = await resolveSessionContext(formData);

  if (!context) {
    redirect(
      buildSessionRedirectPath({
        returnTo,
        params: { sessionError: "invalid" },
      }),
    );
  }

  if (
    !canStartWorkSessionForContext(currentUser, {
      appointmentAssignedUserId: context.appointmentAssignedUserId,
      orderAssignedUserId: context.orderAssignedUserId,
      hasCustomerOnlyContext:
        Boolean(context.customerId) &&
        !context.appointmentId &&
        !context.orderId,
    })
  ) {
    redirect(
      buildSessionRedirectPath({
        returnTo,
        params: { forbidden: 1 },
      }),
    );
  }

  const existingRunningSession =
    await prismaWithAppointmentModels.workSession.findFirst<{
      id: string;
    }>({
    where: {
      userId: currentUser.id,
      status: "RUNNING",
    },
    select: {
      id: true,
    },
  });

  if (existingRunningSession) {
    redirect(
      buildSessionRedirectPath({
        returnTo,
        params: { sessionError: "running" },
      }),
    );
  }

  const session = await prismaWithAppointmentModels.workSession.create<{
    id: string;
  }>({
    data: {
      title: deriveWorkSessionTitle({
        explicitTitle: normalizeOptionalString(getFormString(formData, "title")),
        appointmentTitle: context.appointmentTitle,
        orderNumber: context.orderNumber,
      }),
      status: "RUNNING",
      startedAt: new Date(),
      customerId: context.customerId,
      orderId: context.orderId,
      appointmentId: context.appointmentId,
      userId: currentUser.id,
      notes,
    },
    select: {
      id: true,
    },
  });

  await addOrderActivityIfNeeded({
    orderId: context.orderId,
    adminUserId: currentUser.id,
    type: "WORK_SESSION_STARTED",
    message: `${currentUser.name} hat eine Arbeitssitzung gestartet.`,
  });

  revalidateSessionPaths(context);
  redirect(
    buildSessionRedirectPath({
      returnTo,
      params: { sessionStarted: 1 },
    }),
  );
}

export async function stopWorkSession(formData: FormData): Promise<void> {
  const currentUser = await requireAdminUser();
  const returnTo = normalizeOptionalString(getFormString(formData, "returnTo"));
  const sessionId = getFormString(formData, "sessionId");
  const session = await prismaWithAppointmentModels.workSession.findUnique<{
    id: string;
    userId: string;
    status: "RUNNING" | "STOPPED";
    startedAt: Date;
    appointmentId: string | null;
    orderId: string | null;
    customerId: string | null;
  }>({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      appointmentId: true,
      orderId: true,
      customerId: true,
    },
  });

  if (!session) {
    redirect(
      buildSessionRedirectPath({
        returnTo,
        params: { sessionError: "missing" },
      }),
    );
  }

  if (!canManageWorkSessionRecord(currentUser, session)) {
    redirect(
      buildSessionRedirectPath({
        returnTo,
        params: { forbidden: 1 },
      }),
    );
  }

  if (session.status !== "RUNNING") {
    redirect(
      buildSessionRedirectPath({
        returnTo,
        params: { sessionStopped: 1 },
      }),
    );
  }

  const stoppedAt = new Date();
  const durationMinutes = calculateWorkSessionDurationMinutes({
    startedAt: session.startedAt,
    stoppedAt,
  });

  await prismaWithAppointmentModels.workSession.update({
    where: { id: session.id },
    data: {
      status: "STOPPED",
      stoppedAt,
      durationMinutes,
    },
  });

  await addOrderActivityIfNeeded({
    orderId: session.orderId,
    adminUserId: currentUser.id,
    type: "WORK_SESSION_STOPPED",
    message: `${currentUser.name} hat eine Arbeitssitzung gestoppt (${durationMinutes} Minuten).`,
  });

  revalidateSessionPaths(
    {
      appointmentId: session.appointmentId,
      appointmentTitle: null,
      orderId: session.orderId,
      orderNumber: null,
      customerId: session.customerId,
      orderAssignedUserId: null,
      appointmentAssignedUserId: null,
    },
  );
  redirect(
    buildSessionRedirectPath({
      returnTo,
      params: { sessionStopped: 1 },
    }),
  );
}
