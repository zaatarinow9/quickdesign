import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAdminLoginPath,
  getLegacyAdminLoginPath,
  HIDE_PUBLIC_CHROME_HEADER,
  isAdminLoginPath,
} from "@/lib/admin/admin-routes";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const adminLoginPath = getAdminLoginPath();
  const legacyAdminLoginPath = getLegacyAdminLoginPath();
  const hasAuthCookie = Boolean(request.cookies.get("admin_session")?.value);
  const requestHeaders = new Headers(request.headers);

  if (isAdminLoginPath(pathname) && pathname !== legacyAdminLoginPath) {
    requestHeaders.set(HIDE_PUBLIC_CHROME_HEADER, "1");

    return NextResponse.rewrite(new URL(legacyAdminLoginPath, request.url), {
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (pathname === legacyAdminLoginPath && adminLoginPath !== legacyAdminLoginPath) {
    return NextResponse.redirect(new URL(adminLoginPath, request.url));
  }

  if (pathname.startsWith("/admin")) {
    requestHeaders.set(HIDE_PUBLIC_CHROME_HEADER, "1");

    if (!hasAuthCookie && pathname !== legacyAdminLoginPath) {
      return NextResponse.redirect(new URL(adminLoginPath, request.url));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
