"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin/auth";
import { hasAdminPermission, type AdminRole } from "@/lib/admin/permissions";
import {
  getAdminPasswordPolicyError,
  hashAdminPassword,
} from "@/lib/admin/password";
import {
  buildAdminUserConflictWhere,
  normalizeAdminDisplayName,
  normalizeAdminUsername,
  parseAdminRole,
} from "@/lib/admin/users";
import { normalizeEmailAddress } from "@/lib/email/address";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalEmail(formData: FormData): {
  raw: string;
  normalized: string | null;
} {
  const raw = getFormString(formData, "email");

  return {
    raw,
    normalized: normalizeEmailAddress(raw),
  };
}

function getRedirectPath(formData: FormData, fallbackPath: string): string {
  const returnTo = getFormString(formData, "returnTo");

  if (!returnTo.startsWith("/admin/users")) {
    return fallbackPath;
  }

  return returnTo;
}

function getRoleOrRedirect(formData: FormData, redirectPath: string): AdminRole {
  const role = parseAdminRole(getFormString(formData, "role"));

  if (!role) {
    redirect(`${redirectPath}?error=role`);
  }

  return role;
}

function validatePasswordOrRedirect(
  password: string,
  confirmPassword: string,
  redirectPath: string,
): void {
  if (!password) {
    redirect(`${redirectPath}?error=passwordRequired`);
  }

  if (password !== confirmPassword) {
    redirect(`${redirectPath}?error=passwordMismatch`);
  }

  const passwordPolicyError = getAdminPasswordPolicyError(password);

  if (passwordPolicyError) {
    redirect(
      `${redirectPath}?error=${
        passwordPolicyError.includes("mindestens 10 Zeichen")
          ? "passwordTooShort"
          : "passwordComplexity"
      }`,
    );
  }
}

async function requireUserManagementAdmin(redirectPath: string) {
  const currentUser = await requireAdminUser();

  if (!hasAdminPermission(currentUser, "canManageUsers")) {
    redirect(`${redirectPath}?error=forbidden`);
  }

  return currentUser;
}

async function ensureNoDuplicateAdminUserOrRedirect(
  {
    username,
    email,
    excludeUserId,
  }: {
    username: string;
    email: string | null;
    excludeUserId?: string;
  },
  redirectPath: string,
): Promise<void> {
  const conflictingUser = await prisma.adminUser.findFirst({
    where: buildAdminUserConflictWhere({
      username,
      email,
      excludeUserId,
    }),
    select: {
      id: true,
    },
  });

  if (conflictingUser) {
    redirect(`${redirectPath}?error=duplicate`);
  }
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
    currentRecord.isActive && currentRecord.role === "SUPER_ADMIN";
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

async function ensureSafeSuperAdminMutationOrRedirect(
  {
    actingUserId,
    targetUserId,
    nextRole,
    nextIsActive,
  }: {
    actingUserId: string;
    targetUserId: string;
    nextRole: AdminRole;
    nextIsActive: boolean;
  },
  redirectPath: string,
): Promise<void> {
  if (
    actingUserId === targetUserId &&
    (!nextIsActive || nextRole !== "SUPER_ADMIN")
  ) {
    redirect(`${redirectPath}?error=selfProtection`);
  }

  if (await wouldRemoveLastSuperAdmin(targetUserId, nextRole, nextIsActive)) {
    redirect(`${redirectPath}?error=lastSuperAdmin`);
  }
}

function revalidateUserManagementPaths(userId: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/users/new");
  revalidatePath(`/admin/users/${userId}/edit`);
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
  const redirectPath = "/admin/users/new";

  await requireUserManagementAdmin(redirectPath);

  const username = normalizeAdminUsername(getFormString(formData, "username"));
  const name = normalizeAdminDisplayName(
    getFormString(formData, "name"),
    username,
  );
  const { raw: emailInput, normalized: email } = getOptionalEmail(formData);
  const role = getRoleOrRedirect(formData, redirectPath);
  const password = getFormString(formData, "password");
  const confirmPassword = getFormString(formData, "confirmPassword");
  const isActive = formData.get("isActive") === "on";

  if (!username) {
    redirect(`${redirectPath}?error=usernameRequired`);
  }

  if (emailInput && !email) {
    redirect(`${redirectPath}?error=email`);
  }

  validatePasswordOrRedirect(password, confirmPassword, redirectPath);
  await ensureNoDuplicateAdminUserOrRedirect(
    {
      username,
      email,
    },
    redirectPath,
  );

  try {
    const user = await prisma.adminUser.create({
      data: {
        name,
        username,
        email,
        passwordHash: await hashAdminPassword(password),
        role,
        isActive,
      },
      select: {
        id: true,
      },
    });

    revalidateUserManagementPaths(user.id);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect(`${redirectPath}?error=duplicate`);
    }

    throw error;
  }

  redirect("/admin/users?success=created");
}

export async function updateAdminUserProfile(
  userId: string,
  formData: FormData,
): Promise<void> {
  const redirectPath = `/admin/users/${userId}/edit`;
  const currentUser = await requireUserManagementAdmin(redirectPath);
  const username = normalizeAdminUsername(getFormString(formData, "username"));
  const name = normalizeAdminDisplayName(
    getFormString(formData, "name"),
    username,
  );
  const { raw: emailInput, normalized: email } = getOptionalEmail(formData);
  const role = getRoleOrRedirect(formData, redirectPath);
  const isActive = formData.get("isActive") === "on";

  if (!username) {
    redirect(`${redirectPath}?error=usernameRequired`);
  }

  if (emailInput && !email) {
    redirect(`${redirectPath}?error=email`);
  }

  const existingUser = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
    },
  });

  if (!existingUser) {
    redirect("/admin/users?error=notFound");
  }

  await ensureSafeSuperAdminMutationOrRedirect(
    {
      actingUserId: currentUser.id,
      targetUserId: userId,
      nextRole: role,
      nextIsActive: isActive,
    },
    redirectPath,
  );

  await ensureNoDuplicateAdminUserOrRedirect(
    {
      username,
      email,
      excludeUserId: userId,
    },
    redirectPath,
  );

  try {
    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        name,
        username,
        email,
        role,
        isActive,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect(`${redirectPath}?error=duplicate`);
    }

    throw error;
  }

  revalidateUserManagementPaths(userId);
  redirect(`${redirectPath}?success=updated`);
}

export async function resetAdminUserPassword(
  userId: string,
  formData: FormData,
): Promise<void> {
  const redirectPath = `/admin/users/${userId}/edit`;

  await requireUserManagementAdmin(redirectPath);

  const password = getFormString(formData, "password");
  const confirmPassword = getFormString(formData, "confirmPassword");

  validatePasswordOrRedirect(password, confirmPassword, redirectPath);

  const existingUser = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
    },
  });

  if (!existingUser) {
    redirect("/admin/users?error=notFound");
  }

  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      passwordHash: await hashAdminPassword(password),
    },
  });

  revalidateUserManagementPaths(userId);
  redirect(`${redirectPath}?success=passwordReset`);
}

export async function toggleAdminUserActive(
  userId: string,
  formData: FormData,
): Promise<void> {
  const fallbackPath = "/admin/users";
  const redirectPath = getRedirectPath(formData, fallbackPath);
  const currentUser = await requireUserManagementAdmin(redirectPath);
  const nextIsActive = getFormString(formData, "nextIsActive") === "true";

  const existingUser = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      role: true,
    },
  });

  if (!existingUser) {
    redirect("/admin/users?error=notFound");
  }

  const currentRole = parseAdminRole(existingUser.role) ?? "STAFF";

  await ensureSafeSuperAdminMutationOrRedirect(
    {
      actingUserId: currentUser.id,
      targetUserId: userId,
      nextRole: currentRole,
      nextIsActive,
    },
    redirectPath,
  );

  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      isActive: nextIsActive,
    },
  });

  revalidateUserManagementPaths(userId);
  redirect(
    `${redirectPath}?success=${nextIsActive ? "activated" : "deactivated"}`,
  );
}
