"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearAdminSession, setAdminSession } from "@/lib/admin/auth";
import { verifyAdminPassword } from "@/lib/admin/password";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAdmin(formData: FormData): Promise<void> {
  const username = getFormString(formData, "username").toLowerCase();
  const password = getFormString(formData, "password");

  if (!username || !password) {
    redirect("/admin/login?error=1");
  }

  const user = await prisma.adminUser.findFirst({
    where: {
      isActive: true,
      OR: [{ username }, { email: username }],
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (user && (await verifyAdminPassword(password, user.passwordHash))) {
    try {
      await setAdminSession(user.id);
    } catch (error) {
      console.error("Failed to establish admin session.", error);
      redirect("/admin/login?error=config");
    }

    redirect("/admin");
  }

  redirect("/admin/login?error=1");
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}
