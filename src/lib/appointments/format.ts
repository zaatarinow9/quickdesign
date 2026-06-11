import { format } from "date-fns";

export type AppointmentStatusValue =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type WorkSessionStatusValue = "RUNNING" | "STOPPED";

export type AdminBadgeTone =
  | "slate"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "purple";

const APPOINTMENT_STATUS_META: Record<
  AppointmentStatusValue,
  {
    label: string;
    tone: AdminBadgeTone;
  }
> = {
  SCHEDULED: {
    label: "Geplant",
    tone: "blue",
  },
  COMPLETED: {
    label: "Erledigt",
    tone: "emerald",
  },
  CANCELLED: {
    label: "Storniert",
    tone: "rose",
  },
  NO_SHOW: {
    label: "Nicht erschienen",
    tone: "amber",
  },
};

const WORK_SESSION_STATUS_META: Record<
  WorkSessionStatusValue,
  {
    label: string;
    tone: AdminBadgeTone;
  }
> = {
  RUNNING: {
    label: "Laeuft",
    tone: "blue",
  },
  STOPPED: {
    label: "Gestoppt",
    tone: "slate",
  },
};

export function getAppointmentStatusMeta(status: AppointmentStatusValue): {
  label: string;
  tone: AdminBadgeTone;
} {
  return APPOINTMENT_STATUS_META[status];
}

export function getWorkSessionStatusMeta(status: WorkSessionStatusValue): {
  label: string;
  tone: AdminBadgeTone;
} {
  return WORK_SESSION_STATUS_META[status];
}

export function formatAppointmentDateTime(value: Date): string {
  return format(new Date(value), "dd.MM.yyyy HH:mm");
}

export function formatDateTimeLocalInput(
  value: Date | null | undefined,
): string {
  return value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : "";
}

export function formatWorkDuration(durationMinutes: number | null): string {
  if (durationMinutes === null || durationMinutes <= 0) {
    return "0 Minuten";
  }

  if (durationMinutes < 60) {
    return `${durationMinutes} Minuten`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return `${hours} Std. ${minutes} Min.`;
}

export function calculateWorkSessionDurationMinutes(input: {
  startedAt: Date;
  stoppedAt: Date | null;
}): number {
  const endTime = input.stoppedAt ?? new Date();
  const startedAt = new Date(input.startedAt).getTime();
  const stoppedAt = new Date(endTime).getTime();
  const differenceInMinutes = Math.ceil((stoppedAt - startedAt) / 60_000);

  if (!Number.isFinite(differenceInMinutes) || differenceInMinutes <= 0) {
    return 0;
  }

  return differenceInMinutes;
}

export function sumWorkSessionMinutes(
  sessions: Array<{
    durationMinutes: number | null;
    startedAt: Date;
    stoppedAt: Date | null;
  }>,
): number {
  return sessions.reduce((total, session) => {
    if (session.durationMinutes !== null) {
      return total + session.durationMinutes;
    }

    return (
      total +
      calculateWorkSessionDurationMinutes({
        startedAt: session.startedAt,
        stoppedAt: session.stoppedAt,
      })
    );
  }, 0);
}

export function getReminderStatusLabel(input: {
  reminderAt: Date | null;
  reminderSentAt: Date | null;
}): {
  label: string;
  tone: AdminBadgeTone;
} {
  if (!input.reminderAt) {
    return {
      label: "Keine Erinnerung",
      tone: "slate",
    };
  }

  if (input.reminderSentAt) {
    return {
      label: "Gesendet",
      tone: "emerald",
    };
  }

  if (input.reminderAt.getTime() <= Date.now()) {
    return {
      label: "Faellig",
      tone: "amber",
    };
  }

  return {
    label: "Geplant",
    tone: "blue",
  };
}
