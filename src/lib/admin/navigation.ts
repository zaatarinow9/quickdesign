export const adminNavIconNames = [
  "dashboard",
  "orders",
  "appointments",
  "customers",
  "services",
  "reports",
  "users",
] as const;

export type AdminNavIconName = (typeof adminNavIconNames)[number];

export type AdminNavItem = {
  href: string;
  label: string;
  iconName: AdminNavIconName;
};
