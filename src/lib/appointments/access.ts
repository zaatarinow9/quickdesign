import type { CurrentAdminUser } from "@/lib/admin/auth";
import {
  canManageAppointments,
  canManageWorkSessions,
  isSuperAdmin,
} from "@/lib/admin/permissions";

type AppointmentAccessRecord = {
  assignedUserId: string | null;
};

type WorkSessionAccessContext = {
  appointmentAssignedUserId?: string | null;
  orderAssignedUserId?: string | null;
  hasCustomerOnlyContext?: boolean;
};

type WorkSessionAccessRecord = {
  userId: string;
};

export function canViewAppointmentRecord(
  user: CurrentAdminUser,
  appointment: AppointmentAccessRecord,
): boolean {
  if (canManageAppointments(user) || isSuperAdmin(user)) {
    return true;
  }

  return appointment.assignedUserId === user.id;
}

export function canManageAppointmentRecord(user: CurrentAdminUser): boolean {
  return canManageAppointments(user) || isSuperAdmin(user);
}

export function canStartWorkSessionForContext(
  user: CurrentAdminUser,
  context: WorkSessionAccessContext,
): boolean {
  if (!canManageWorkSessions(user)) {
    return false;
  }

  if (canManageAppointmentRecord(user)) {
    return true;
  }

  if (context.appointmentAssignedUserId) {
    return context.appointmentAssignedUserId === user.id;
  }

  if (context.orderAssignedUserId) {
    return context.orderAssignedUserId === user.id;
  }

  return context.hasCustomerOnlyContext ? false : true;
}

export function canManageWorkSessionRecord(
  user: CurrentAdminUser,
  session: WorkSessionAccessRecord,
): boolean {
  if (!canManageWorkSessions(user)) {
    return false;
  }

  if (canManageAppointmentRecord(user)) {
    return true;
  }

  return session.userId === user.id;
}
