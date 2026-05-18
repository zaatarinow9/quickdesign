"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, requireAdminUser } from "@/lib/admin/auth";
import { hashAdminPassword } from "@/lib/admin/password";
import { normalizeAdminRole, type AdminRole } from "@/lib/admin/permissions";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalEmail(formData: FormData): string | null {
  const email = getFormString(formData, "email");
  return email ? email.toLowerCase() : null;
}

function getRole(formData: FormData): AdminRole {
  return normalizeAdminRole(getFormString(formData, "role"));
}

export async function createAdminUser(formData: FormData): Promise<void> {
  await requireAdminPermission("canManageUsers");

  const name = getFormString(formData, "name");
  const username = getFormString(formData, "username").toLowerCase();
  const password = getFormString(formData, "password");

  if (!name || !username || password.length < 6) {
    redirect("/admin/users?error=invalid");
  }

  await prisma.adminUser.create({
    data: {
      name,
      username,
      email: getOptionalEmail(formData),
      passwordHash: await hashAdminPassword(password),
      role: getRole(formData),
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function updateAdminUser(
  userId: string,
  formData: FormData,
): Promise<void> {
  await requireAdminPermission("canManageUsers");
  const currentUser = await requireAdminUser();

  const name = getFormString(formData, "name");
  const username = getFormString(formData, "username").toLowerCase();
  const password = getFormString(formData, "password");
  const nextRole = getRole(formData);
  const nextIsActive = formData.get("isActive") === "on";

  if (!name || !username) {
    redirect("/admin/users?error=invalid");
  }

  if (currentUser.id === userId && (!nextIsActive || nextRole !== "SUPER_ADMIN")) {
    redirect("/admin/users?error=self");
  }

  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      name,
      username,
      email: getOptionalEmail(formData),
      role: nextRole,
      isActive: nextIsActive,
      ...(password
        ? {
            passwordHash: await hashAdminPassword(password),
          }
        : {}),
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}
