"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, requireAdminUser } from "@/lib/admin/auth";
import { normalizeEmailAddress } from "@/lib/email/address";
import {
  getAdminPasswordPolicyError,
  hashAdminPassword,
} from "@/lib/admin/password";
import { normalizeAdminRole, type AdminRole } from "@/lib/admin/permissions";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalEmail(formData: FormData): string | null {
  return normalizeEmailAddress(getFormString(formData, "email"));
}

function getRole(formData: FormData): AdminRole {
  return normalizeAdminRole(getFormString(formData, "role"));
}

async function wouldRemoveLastSuperAdmin(
  userId: string,
  nextRole: AdminRole,
  nextIsActive: boolean,
): Promise<boolean> {
  const currentRecord = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!currentRecord) {
    return false;
  }

  const currentlyActiveSuperAdmin =
    currentRecord.isActive &&
    normalizeAdminRole(currentRecord.role) === "SUPER_ADMIN";
  const remainsActiveSuperAdmin = nextIsActive && nextRole === "SUPER_ADMIN";

  if (!currentlyActiveSuperAdmin || remainsActiveSuperAdmin) {
    return false;
  }

  const activeSuperAdminCount = await prisma.adminUser.count({
    where: {
      isActive: true,
      role: "SUPER_ADMIN",
    },
  });

  return activeSuperAdminCount <= 1;
}

function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createAdminUser(formData: FormData): Promise<void> {
  await requireAdminPermission("canManageUsers");

  const name = getFormString(formData, "name");
  const username = getFormString(formData, "username").toLowerCase();
  const password = getFormString(formData, "password");
  const emailInput = getFormString(formData, "email");
  const email = getOptionalEmail(formData);
  const passwordPolicyError = getAdminPasswordPolicyError(password);

  if (!name || !username) {
    redirect("/admin/users?error=invalid");
  }

  if (emailInput && !email) {
    redirect("/admin/users?error=email");
  }

  if (passwordPolicyError) {
    redirect("/admin/users?error=weak");
  }

  try {
    await prisma.adminUser.create({
      data: {
        name,
        username,
        email,
        passwordHash: await hashAdminPassword(password),
        role: getRole(formData),
        isActive: formData.get("isActive") === "on",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/admin/users?error=duplicate");
    }

    throw error;
  }

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
  const emailInput = getFormString(formData, "email");
  const email = getOptionalEmail(formData);

  if (!name || !username) {
    redirect("/admin/users?error=invalid");
  }

  if (emailInput && !email) {
    redirect("/admin/users?error=email");
  }

  if (password) {
    const passwordPolicyError = getAdminPasswordPolicyError(password);

    if (passwordPolicyError) {
      redirect("/admin/users?error=weak");
    }
  }

  if (currentUser.id === userId && (!nextIsActive || nextRole !== "SUPER_ADMIN")) {
    redirect("/admin/users?error=self");
  }

  if (await wouldRemoveLastSuperAdmin(userId, nextRole, nextIsActive)) {
    redirect("/admin/users?error=lastSuper");
  }

  try {
    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        name,
        username,
        email,
        role: nextRole,
        isActive: nextIsActive,
        ...(password
          ? {
              passwordHash: await hashAdminPassword(password),
            }
          : {}),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/admin/users?error=duplicate");
    }

    throw error;
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}
