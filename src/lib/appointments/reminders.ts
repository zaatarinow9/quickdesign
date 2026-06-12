import "server-only";

import { format } from "date-fns";
import { sendSmtpMail } from "@/lib/email/smtp";
import { normalizeEmailAddress } from "@/lib/email/address";
import { getConfiguredAppBaseUrl } from "@/lib/env";
import { prismaWithAppointmentModels } from "@/lib/prisma-appointments";

type AppointmentReminderTarget = {
  id: string;
  title: string;
  startAt: Date;
  reminderAt: Date | null;
  location: string | null;
  notes: string | null;
  assignedUser: {
    id: string;
    name: string;
    email: string | null;
    username: string;
  } | null;
  customer: {
    id: string;
    name: string;
  } | null;
  order: {
    id: string;
    orderNumber: number;
  } | null;
};

export type AppointmentReminderRunResult = {
  dueCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  sentAppointmentIds: string[];
  warnings: string[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveReminderRecipient(
  user: AppointmentReminderTarget["assignedUser"],
): string | null {
  if (!user) {
    return null;
  }

  return normalizeEmailAddress(user.email) ?? normalizeEmailAddress(user.username);
}

function buildAdminAppointmentLink(appointmentId: string): string | null {
  const appBaseUrl = getConfiguredAppBaseUrl();

  if (!appBaseUrl) {
    return null;
  }

  try {
    return new URL(`/admin/appointments/${appointmentId}`, appBaseUrl).toString();
  } catch {
    return null;
  }
}

function buildAdminOrderLink(orderId: string): string | null {
  const appBaseUrl = getConfiguredAppBaseUrl();

  if (!appBaseUrl) {
    return null;
  }

  try {
    return new URL(`/admin/orders/${orderId}`, appBaseUrl).toString();
  } catch {
    return null;
  }
}

function buildReminderEmailContent(appointment: AppointmentReminderTarget): {
  subject: string;
  text: string;
  html: string;
} {
  const appointmentLink = buildAdminAppointmentLink(appointment.id);
  const orderLink = appointment.order
    ? buildAdminOrderLink(appointment.order.id)
    : null;
  const lines = [
    `Hallo ${appointment.assignedUser?.name ?? "Team"},`,
    "",
    `dies ist eine Erinnerung für den Termin "${appointment.title}".`,
    "",
    `Beginn: ${format(appointment.startAt, "dd.MM.yyyy HH:mm")}`,
    appointment.customer ? `Kunde: ${appointment.customer.name}` : null,
    appointment.order ? `Auftrag: #${appointment.order.orderNumber}` : null,
    appointment.location ? `Ort: ${appointment.location}` : null,
    appointment.notes ? `Notizen: ${appointment.notes}` : null,
    appointmentLink ? `Termin: ${appointmentLink}` : null,
    orderLink ? `Auftrag: ${orderLink}` : null,
    "",
    "Bitte planen Sie den Termin entsprechend ein.",
  ].filter((line): line is string => Boolean(line));

  const htmlParts = [
    `<p>Hallo ${escapeHtml(appointment.assignedUser?.name ?? "Team")},</p>`,
    `<p>dies ist eine Erinnerung für den Termin "<strong>${escapeHtml(appointment.title)}</strong>".</p>`,
    "<ul>",
    `<li><strong>Beginn:</strong> ${format(appointment.startAt, "dd.MM.yyyy HH:mm")}</li>`,
    appointment.customer
      ? `<li><strong>Kunde:</strong> ${escapeHtml(appointment.customer.name)}</li>`
      : "",
    appointment.order
      ? `<li><strong>Auftrag:</strong> #${appointment.order.orderNumber}</li>`
      : "",
    appointment.location
      ? `<li><strong>Ort:</strong> ${escapeHtml(appointment.location)}</li>`
      : "",
    appointment.notes
      ? `<li><strong>Notizen:</strong> ${escapeHtml(appointment.notes)}</li>`
      : "",
    "</ul>",
    appointmentLink
      ? `<p><a href="${appointmentLink}">Termin im Adminbereich öffnen</a></p>`
      : "",
    orderLink ? `<p><a href="${orderLink}">Auftrag öffnen</a></p>` : "",
    "<p>Bitte planen Sie den Termin entsprechend ein.</p>",
  ].filter((part) => part !== "");

  return {
    subject: `Terminerinnerung: ${appointment.title}`,
    text: lines.join("\n"),
    html: htmlParts.join(""),
  };
}

async function markReminderAsSent(appointmentId: string): Promise<void> {
  await prismaWithAppointmentModels.appointment.update({
    where: { id: appointmentId },
    data: {
      reminderSentAt: new Date(),
    },
  });
}

async function getDueAppointments(now: Date): Promise<AppointmentReminderTarget[]> {
  return prismaWithAppointmentModels.appointment.findMany<AppointmentReminderTarget>({
    where: {
      status: "SCHEDULED",
      reminderAt: {
        lte: now,
      },
      reminderSentAt: null,
      assignedUserId: {
        not: null,
      },
    },
    orderBy: {
      reminderAt: "asc",
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
    },
  });
}

export async function sendDueAppointmentReminders(
  now = new Date(),
): Promise<AppointmentReminderRunResult> {
  const dueAppointments = await getDueAppointments(now);
  const result: AppointmentReminderRunResult = {
    dueCount: dueAppointments.length,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    sentAppointmentIds: [],
    warnings: [],
  };

  for (const appointment of dueAppointments) {
    const recipient = resolveReminderRecipient(appointment.assignedUser);

    if (!recipient) {
      result.skippedCount += 1;
      result.warnings.push(
        `Termin ${appointment.title} konnte nicht versendet werden, weil dem Mitarbeiter keine gültige E-Mail-Adresse zugeordnet ist.`,
      );
      continue;
    }

    const email = buildReminderEmailContent(appointment);

    try {
      await sendSmtpMail({
        to: recipient,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      await markReminderAsSent(appointment.id);
      result.sentCount += 1;
      result.sentAppointmentIds.push(appointment.id);
    } catch (error) {
      result.failedCount += 1;
      result.warnings.push(
        `Versand fuer Termin ${appointment.title} an ${recipient} ist fehlgeschlagen.`,
      );

      console.error("Appointment reminder email failed.", {
        appointmentId: appointment.id,
        recipient,
        reminderAt: appointment.reminderAt
          ? format(appointment.reminderAt, "yyyy-MM-dd HH:mm")
          : null,
        error,
      });
    }
  }

  return result;
}
