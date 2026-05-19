export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export type AdminPermission =
  | "canManageServices"
  | "canManageUsers"
  | "canManageOrders"
  | "canAssignOrders"
  | "canClaimOrders"
  | "canUpdateAssignedOrders"
  | "canViewReports"
  | "canViewAllReports"
  | "canViewCustomers"
  | "canManageCustomers"
  | "canCreateManualOrders"
  | "canApplyDiscounts"
  | "canEditFinancials"
  | "canArchiveOrders";

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
    case "canViewReports":
    case "canViewCustomers":
    case "canCreateManualOrders":
      return role === "ADMIN" || role === "STAFF";
    case "canViewAllReports":
    case "canApplyDiscounts":
    case "canEditFinancials":
    case "canArchiveOrders":
      return role === "ADMIN";
    case "canManageServices":
    case "canManageUsers":
    case "canAssignOrders":
    case "canManageCustomers":
      return false;
    default:
      return false;
  }
}

export function canManageCustomers(user: AdminPermissionUser | null): boolean {
  return hasAdminPermission(user, "canManageCustomers");
}

export function canViewCustomers(user: AdminPermissionUser | null): boolean {
  return hasAdminPermission(user, "canViewCustomers");
}

export function canCreateManualOrders(
  user: AdminPermissionUser | null,
): boolean {
  return hasAdminPermission(user, "canCreateManualOrders");
}

export function canApplyDiscounts(user: AdminPermissionUser | null): boolean {
  return hasAdminPermission(user, "canApplyDiscounts");
}

export function canEditFinancials(user: AdminPermissionUser | null): boolean {
  return hasAdminPermission(user, "canEditFinancials");
}

export function canViewReports(user: AdminPermissionUser | null): boolean {
  return hasAdminPermission(user, "canViewReports");
}

export function canViewAllReports(user: AdminPermissionUser | null): boolean {
  return hasAdminPermission(user, "canViewAllReports");
}

export function canArchiveOrders(user: AdminPermissionUser | null): boolean {
  return hasAdminPermission(user, "canArchiveOrders");
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
