"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, setAdminSession } from "@/lib/admin/auth";
import {
  getAdminPasswordPolicyError,
  hashAdminPassword,
  verifyAdminPassword,
} from "@/lib/admin/password";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function changeCurrentAdminPassword(
  formData: FormData,
): Promise<void> {
  const currentUser = await requireAdminUser();
  const currentPassword = getFormString(formData, "currentPassword");
  const nextPassword = getFormString(formData, "nextPassword");
  const confirmPassword = getFormString(formData, "confirmPassword");

  if (!currentPassword || !nextPassword || !confirmPassword) {
    redirect("/admin?passwordError=missing");
  }

  if (nextPassword !== confirmPassword) {
    redirect("/admin?passwordError=match");
  }

  const passwordPolicyError = getAdminPasswordPolicyError(nextPassword);
  if (passwordPolicyError) {
    redirect("/admin?passwordError=weak");
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: currentUser.id },
    select: { passwordHash: true },
  });

  if (!user || !(await verifyAdminPassword(currentPassword, user.passwordHash))) {
    redirect("/admin?passwordError=current");
  }

  if (await verifyAdminPassword(nextPassword, user.passwordHash)) {
    redirect("/admin?passwordError=reuse");
  }

  await prisma.adminUser.update({
    where: { id: currentUser.id },
    data: {
      passwordHash: await hashAdminPassword(nextPassword),
    },
  });

  await setAdminSession(currentUser.id);
  revalidatePath("/admin");
  redirect("/admin?passwordChanged=1");
}
