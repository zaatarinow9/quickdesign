export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export type AdminPermission =
  | "canManageServices"
  | "canManageUsers"
  | "canManageOrders"
  | "canAssignOrders"
  | "canClaimOrders"
  | "canUpdateAssignedOrders"
  | "canViewReports";

export type AdminPermissionUser = {
  id: string;
  role: string;
  isActive: boolean;
};

export function normalizeAdminRole(role: string | null | undefined): AdminRole {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
    case "STAFF":
      return role;
    default:
      return "STAFF";
  }
}

export function isSuperAdmin(user: AdminPermissionUser): boolean {
  return user.isActive && normalizeAdminRole(user.role) === "SUPER_ADMIN";
}

export function hasAdminPermission(
  user: AdminPermissionUser | null,
  permission: AdminPermission,
): boolean {
  if (!user?.isActive) {
    return false;
  }

  const role = normalizeAdminRole(user.role);

  if (role === "SUPER_ADMIN") {
    return true;
  }

  switch (permission) {
    case "canManageOrders":
    case "canClaimOrders":
    case "canUpdateAssignedOrders":
      return role === "ADMIN" || role === "STAFF";
    case "canManageServices":
    case "canManageUsers":
    case "canAssignOrders":
    case "canViewReports":
      return false;
    default:
      return false;
  }
}

export function canUpdateOrder(
  user: AdminPermissionUser | null,
  order: { assignedToId: string | null },
): boolean {
  if (!user?.isActive) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  return (
    hasAdminPermission(user, "canUpdateAssignedOrders") &&
    order.assignedToId === user.id
  );
}
