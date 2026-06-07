import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { extractStoredOrderTextInputs } from "@/lib/services/configuration/snapshot";
import { getSnapshotUploadFileRecords } from "@/lib/storage/order-files";
import {
  createSignedSupabaseDownloadUrl,
  getSupabaseStorageBucketName,
} from "@/lib/storage/supabase-storage";

function buildFileOpenErrorResponse(status: number): NextResponse {
  return NextResponse.json(
    { error: "Datei konnte nicht geoeffnet werden." },
    { status },
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<NextResponse> {
  await requireAdminUser();

  const { id } = await Promise.resolve(context.params);
  const requestedPath = request.nextUrl.searchParams.get("path")?.trim() ?? "";

  if (!requestedPath) {
    return buildFileOpenErrorResponse(400);
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      items: {
        select: {
          textInputs: true,
        },
      },
    },
  });

  if (!order) {
    return buildFileOpenErrorResponse(404);
  }

  const configuredBucket = getSupabaseStorageBucketName();
  const matchedFile = order.items
    .flatMap((item) => {
      const { configurationSnapshot } = extractStoredOrderTextInputs(item.textInputs);

      if (!configurationSnapshot) {
        return [];
      }

      return getSnapshotUploadFileRecords(configurationSnapshot);
    })
    .find(
      (file) =>
        file.path === requestedPath &&
        file.bucket === configuredBucket &&
        typeof file.path === "string" &&
        file.path.length > 0,
    );

  if (!matchedFile?.path) {
    return buildFileOpenErrorResponse(404);
  }

  try {
    const signedUrl = await createSignedSupabaseDownloadUrl({
      path: matchedFile.path,
      downloadFileName: matchedFile.originalName ?? matchedFile.fileName,
    });

    if (!signedUrl) {
      console.error("Order file signed URL creation returned no URL.", {
        orderId: order.id,
        requestedPath,
      });

      return buildFileOpenErrorResponse(500);
    }

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Order file signed URL creation failed.", {
      orderId: order.id,
      requestedPath,
      error,
    });

    return buildFileOpenErrorResponse(500);
  }
}
