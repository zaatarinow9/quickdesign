import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/admin/permissions";

export const ADMIN_SESSION_COOKIE = "admin_session";

export type CurrentAdminUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "development-admin-session-secret"
  );
}

function signSessionUserId(userId: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(userId)
    .digest("hex");
}

function createSessionToken(userId: string): string {
  return `${userId}.${signSessionUserId(userId)}`;
}

function readSessionUserId(token: string | undefined): string | null {
  if (!token) {
    return null;
  }

  const [userId, signature] = token.split(".");
  if (!userId || !signature) {
    return null;
  }

  const expectedSignature = signSessionUserId(userId);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  return userId;
}

export async function setAdminSession(userId: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  const cookieStore = await cookies();
  const userId = readSessionUserId(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (!userId) {
    return null;
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user?.isActive) {
    return null;
  }

  return user;
}

export async function requireAdminUser(): Promise<CurrentAdminUser> {
  const user = await getCurrentAdminUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function requireAdminPermission(
  permission: AdminPermission,
): Promise<CurrentAdminUser> {
  const user = await requireAdminUser();

  if (!hasAdminPermission(user, permission)) {
    redirect("/admin?forbidden=1");
  }

  return user;
}
