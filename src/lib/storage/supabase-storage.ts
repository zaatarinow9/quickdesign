import "server-only";

import type { OrderStoredFileMetadata } from "@/lib/storage/order-files";

type SupabaseStorageConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
};

function readRequiredEnvValue(name: string): string {
  const value = process.env[name]?.trim() ?? "";

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getSupabaseStorageConfig(): SupabaseStorageConfig {
  const supabaseUrl = readRequiredEnvValue("SUPABASE_URL");
  const serviceRoleKey = readRequiredEnvValue("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = readRequiredEnvValue("SUPABASE_STORAGE_BUCKET");

  try {
    const parsedUrl = new URL(supabaseUrl);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new Error("SUPABASE_URL is invalid.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  };
}

export function getSupabaseStorageBucketName(): string {
  return getSupabaseStorageConfig().bucket;
}

function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildStorageApiUrl(pathname: string): string {
  const { supabaseUrl } = getSupabaseStorageConfig();
  return new URL(pathname, supabaseUrl).toString();
}

function getStorageHeaders(contentType?: string): HeadersInit {
  const { serviceRoleKey } = getSupabaseStorageConfig();

  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function readStorageErrorMessage(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as unknown;

    if (
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return payload.message;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to status text.
  }

  return response.statusText || null;
}

export async function uploadFileToSupabaseStorage(input: {
  path: string;
  file: File;
}): Promise<Pick<OrderStoredFileMetadata, "bucket" | "path">> {
  const config = getSupabaseStorageConfig();
  const contentType =
    input.file.type.trim() !== "" ? input.file.type.trim() : "application/octet-stream";
  const uploadUrl = buildStorageApiUrl(
    `/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodeStoragePath(
      input.path,
    )}`,
  );
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...getStorageHeaders(contentType),
      "x-upsert": "false",
    },
    body: Buffer.from(await input.file.arrayBuffer()),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorMessage = await readStorageErrorMessage(response);
    throw new Error(
      errorMessage
        ? `Supabase Storage upload failed: ${errorMessage}`
        : "Supabase Storage upload failed.",
    );
  }

  return {
    bucket: config.bucket,
    path: input.path,
  };
}

export async function createSignedSupabaseDownloadUrl(input: {
  path: string;
  downloadFileName: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const config = getSupabaseStorageConfig();
  const expiresInSeconds = input.expiresInSeconds ?? 300;
  const signUrl = buildStorageApiUrl(
    `/storage/v1/object/sign/${encodeURIComponent(config.bucket)}/${encodeStoragePath(
      input.path,
    )}`,
  );
  const response = await fetch(signUrl, {
    method: "POST",
    headers: getStorageHeaders("application/json"),
    body: JSON.stringify({
      expiresIn: expiresInSeconds,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorMessage = await readStorageErrorMessage(response);
    throw new Error(
      errorMessage
        ? `Supabase signed URL creation failed: ${errorMessage}`
        : "Supabase signed URL creation failed.",
    );
  }

  const payload = (await response.json()) as unknown;

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("signedURL" in payload) ||
    typeof payload.signedURL !== "string"
  ) {
    throw new Error("Supabase signed URL response was invalid.");
  }

  const downloadUrl = new URL(`/storage/v1${payload.signedURL}`, config.supabaseUrl);
  downloadUrl.searchParams.set(
    "download",
    input.downloadFileName.trim() || "Datei",
  );

  return downloadUrl.toString();
}

export async function deleteFilesFromSupabaseStorage(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  const config = getSupabaseStorageConfig();
  const deleteUrl = buildStorageApiUrl(
    `/storage/v1/object/${encodeURIComponent(config.bucket)}`,
  );
  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: getStorageHeaders("application/json"),
    body: JSON.stringify({
      prefixes: paths,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorMessage = await readStorageErrorMessage(response);
    throw new Error(
      errorMessage
        ? `Supabase Storage cleanup failed: ${errorMessage}`
        : "Supabase Storage cleanup failed.",
    );
  }
}
