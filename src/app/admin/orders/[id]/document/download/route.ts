import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin/auth";
import { hasAdminPermission } from "@/lib/admin/permissions";
import {
  buildOrderDocumentHref,
  normalizeOrderDocumentQueryType,
} from "@/lib/orders/documents";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (!hasAdminPermission(currentUser, "canManageOrders")) {
    return NextResponse.redirect(new URL("/admin?forbidden=1", request.url));
  }

  const { id } = await context.params;
  const requestUrl = new URL(request.url);
  const documentType = normalizeOrderDocumentQueryType(
    requestUrl.searchParams.get("type"),
  );
  const previewUrl = new URL(
    buildOrderDocumentHref(id, documentType),
    request.url,
  );

  previewUrl.searchParams.set("type", documentType);
  previewUrl.searchParams.set("download", "browser");
  previewUrl.searchParams.set("autoprint", "1");

  return NextResponse.redirect(previewUrl);
}
