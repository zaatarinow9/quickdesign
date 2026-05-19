import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/admin/permissions";
import {
  getAdminSessionSecret,
  isProductionEnvironment,
} from "@/lib/env";

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

function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

function buildSessionPayload(userId: string, expiresAt: number): string {
  return `${userId}:${expiresAt}`;
}

function signSessionPayload(payload: string): string {
  return createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("hex");
}

function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  return `${userId}.${expiresAt}.${signSessionPayload(
    buildSessionPayload(userId, expiresAt),
  )}`;
}

function readSessionUserId(token: string | undefined): string | null {
  if (!token) {
    return null;
  }

  const [userId, expiresAtRaw, signature] = token.split(".");
  if (!userId || !expiresAtRaw || !signature) {
    return null;
  }

  const expiresAt = Number.parseInt(expiresAtRaw, 10);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  const expectedSignature = signSessionPayload(
    buildSessionPayload(userId, expiresAt),
  );
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

  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    createSessionToken(userId),
    getAdminSessionCookieOptions(),
  );
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
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
