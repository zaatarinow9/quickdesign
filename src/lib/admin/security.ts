import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ADMIN_USERNAME,
  isDefaultAdminPasswordHash,
} from "@/lib/admin/password";
import {
  getEnvironmentReadinessWarnings,
  isProductionEnvironment,
  type EnvironmentReadinessWarning,
} from "@/lib/env";

export type AdminSecurityWarning = EnvironmentReadinessWarning;

export async function getAdminSecurityWarnings(): Promise<
  AdminSecurityWarning[]
> {
  const warnings = [...getEnvironmentReadinessWarnings()];
  const defaultAdminUser = await prisma.adminUser.findFirst({
    where: {
      username: {
        equals: DEFAULT_ADMIN_USERNAME,
        mode: "insensitive",
      },
    },
    select: {
      isActive: true,
      passwordHash: true,
    },
  });

  if (
    defaultAdminUser?.isActive &&
    (await isDefaultAdminPasswordHash(defaultAdminUser.passwordHash))
  ) {
    warnings.unshift({
      id: "default_admin_password_active",
      level: isProductionEnvironment() ? "error" : "warning",
      message:
        "Der Standardzugang admin / admin123 ist noch aktiv. Aendern Sie dieses Passwort vor dem Produktivbetrieb sofort.",
    });
  }

  return warnings;
}
