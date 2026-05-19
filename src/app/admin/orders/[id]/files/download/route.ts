import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin/auth";
import { hasAdminPermission } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import { getSnapshotUploadFileRecords } from "@/lib/storage/order-files";
import {
  createSignedSupabaseDownloadUrl,
  getSupabaseStorageBucketName,
} from "@/lib/storage/supabase-storage";
import {
  extractStoredOrderTextInputs,
  getSnapshotOrBuildLegacy,
  normalizeLegacySelectedOptions,
} from "@/lib/services/configuration/snapshot";

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
  const requestedPath = requestUrl.searchParams.get("path")?.trim() ?? "";

  if (!requestedPath) {
    return NextResponse.json({ error: "Missing file path." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      items: {
        select: {
          serviceId: true,
          serviceName: true,
          price: true,
          quantity: true,
          selectedOptions: true,
          textInputs: true,
          designData: true,
          orderNotes: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!order) {
    return NextResponse.redirect(new URL("/admin/orders", request.url));
  }

  const configuredBucket = getSupabaseStorageBucketName();
  const matchingFile = order.items
    .flatMap((item) => {
      const selectedOptions = normalizeLegacySelectedOptions(item.selectedOptions);
      const storedTextInputs = extractStoredOrderTextInputs(item.textInputs);
      const snapshot = getSnapshotOrBuildLegacy({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        basePrice: item.price,
        totalPrice: item.price,
        quantity: item.quantity,
        selectedOptions,
        textInputs: storedTextInputs.textInputs,
        designData: item.designData,
        orderNotes: item.orderNotes,
        configurationSnapshot: storedTextInputs.configurationSnapshot,
      });

      return getSnapshotUploadFileRecords(snapshot);
    })
    .find(
      (file) =>
        file.isStored &&
        file.path === requestedPath &&
        file.bucket === configuredBucket,
    );

  if (!matchingFile?.path) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  try {
    const signedUrl = await createSignedSupabaseDownloadUrl({
      path: matchingFile.path,
      downloadFileName: matchingFile.originalName,
      expiresInSeconds: 300,
    });

    return NextResponse.redirect(new URL(signedUrl));
  } catch (error) {
    console.error("Order file download signing failed:", error);

    return NextResponse.json(
      { error: "Download URL could not be created." },
      { status: 500 },
    );
  }
}
