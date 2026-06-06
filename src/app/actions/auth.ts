"use server";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearAdminSession, setAdminSession } from "@/lib/admin/auth";
import { verifyAdminPassword } from "@/lib/admin/password";
import {
  normalizeAdminLoginIdentifier,
  normalizeAdminUsername,
} from "@/lib/admin/users";
import { normalizeEmailAddress } from "@/lib/email/address";

type AdminLoginCandidate = {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  isActive: boolean;
};

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveAdminLoginCandidate(
  identifier: ReturnType<typeof normalizeAdminLoginIdentifier>,
  candidates: AdminLoginCandidate[],
): AdminLoginCandidate | null {
  const usernameMatches = candidates.filter((candidate) => {
    return normalizeAdminUsername(candidate.username) === identifier.username;
  });
  const emailMatches =
    identifier.email === null
      ? []
      : candidates.filter((candidate) => {
          return normalizeEmailAddress(candidate.email) === identifier.email;
        });
  const preferredMatches =
    identifier.email !== null && emailMatches.length > 0
      ? emailMatches
      : usernameMatches;

  if (preferredMatches.length !== 1) {
    if (preferredMatches.length > 1) {
      console.error(
        "Ambiguous admin login identifier resolved against multiple AdminUser records.",
        {
          candidateCount: preferredMatches.length,
          loginType: identifier.email !== null ? "email-or-username" : "username",
        },
      );
    }

    return null;
  }

  return preferredMatches[0];
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

  const matchingUsers = await prisma.adminUser.findMany({
    where: {
      OR: loginWhereClauses,
    },
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
      isActive: true,
    },
  });
  const user = resolveAdminLoginCandidate(identifier, matchingUsers);

  if (!user) {
    redirect("/admin/login?error=invalid");
  }

  if (!user.isActive) {
    redirect("/admin/login?error=inactive");
  }

  if (!(await verifyAdminPassword(password, user.passwordHash))) {
    redirect("/admin/login?error=invalid");
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
