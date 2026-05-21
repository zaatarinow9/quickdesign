"use server";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearAdminSession, setAdminSession } from "@/lib/admin/auth";
import { verifyAdminPassword } from "@/lib/admin/password";
import { normalizeAdminLoginIdentifier } from "@/lib/admin/users";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAdmin(formData: FormData): Promise<void> {
  const identifier = normalizeAdminLoginIdentifier(
    getFormString(formData, "username"),
  );
  const password = getFormString(formData, "password");

  if (!identifier.raw || !password) {
    redirect("/admin/login?error=invalid");
  }

  const loginWhereClauses: Prisma.AdminUserWhereInput[] = [
    {
      username: {
        equals: identifier.username,
        mode: "insensitive",
      },
    },
  ];

  if (identifier.email) {
    loginWhereClauses.push({
      email: {
        equals: identifier.email,
        mode: "insensitive",
      },
    });
  }

  const user = await prisma.adminUser.findFirst({
    where: {
      OR: loginWhereClauses,
    },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !(await verifyAdminPassword(password, user.passwordHash))) {
    redirect("/admin/login?error=invalid");
  }

  if (!user.isActive) {
    redirect("/admin/login?error=inactive");
  }

  try {
    await setAdminSession(user.id);
  } catch (error) {
    console.error("Failed to establish admin session.", error);
    redirect("/admin/login?error=config");
  }

  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}
