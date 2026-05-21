export const adminNavIconNames = [
  "dashboard",
  "orders",
  "customers",
  "reports",
  "services",
  "users",
] as const;

export type AdminNavIconName = (typeof adminNavIconNames)[number];

export type AdminNavItem = {
  href: string;
  label: string;
  iconName: AdminNavIconName;
};
