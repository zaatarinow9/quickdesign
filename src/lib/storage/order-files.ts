import type {
  ServiceConfigurationSnapshot,
  ServiceConfigurationSnapshotUploadFile,
} from "@/lib/services/configuration/snapshot";

export type CartPendingUploadSource = "option" | "upload";

export type CartPendingUpload = {
  source: CartPendingUploadSource;
  fieldKey: string;
  fieldLabel: string;
  slotIndex: number;
  customerLabel: string;
  file: File;
};

export type OrderStoredFileMetadata = {
  bucket: string;
  path: string;
  originalName: string;
  customerLabel: string | null;
  fieldKey: string;
  fieldLabel: string;
  contentType: string | null;
  size: number;
  uploadedAt: string;
};

export type OrderSnapshotFileRecord = {
  fieldKey: string;
  fieldLabel: string;
  fileName: string;
  originalName: string;
  customerLabel: string | null;
  contentType: string | null;
  size: number | null;
  uploadedAt: string | null;
  bucket: string | null;
  path: string | null;
  fileUrl: string | null;
  isStored: boolean;
};

type FileValidationOptions = {
  accept: string;
  maxFileSizeMb: number | null;
  maxFileSizeMessage?: string;
};

type FileValidationResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

type FileLikeForValidation = {
  name: string;
  size: number;
  type: string;
};

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

export function isInlineBrowserUrl(value: string | null | undefined): boolean {
  const normalizedValue = normalizeOptionalString(value)?.toLowerCase();

  return Boolean(
    normalizedValue &&
      (normalizedValue.startsWith("data:") ||
        normalizedValue.startsWith("blob:")),
  );
}

export function getFileExtension(fileName: string): string | null {
  const normalizedName = fileName.trim();
  const extensionIndex = normalizedName.lastIndexOf(".");

  if (extensionIndex < 0 || extensionIndex === normalizedName.length - 1) {
    return null;
  }

  return normalizedName.slice(extensionIndex).toLowerCase();
}

function normalizeMimeType(value: string): string {
  return value.trim().toLowerCase();
}

function getAcceptTokens(accept: string): string[] {
  return accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== "");
}

function matchesAcceptToken(
  file: FileLikeForValidation,
  acceptToken: string,
): boolean {
  if (acceptToken === "*/*") {
    return true;
  }

  const extension = getFileExtension(file.name);
  const mimeType = normalizeMimeType(file.type);

  if (acceptToken.startsWith(".")) {
    return extension === acceptToken;
  }

  if (acceptToken.endsWith("/*")) {
    const prefix = acceptToken.slice(0, -1);
    return mimeType.startsWith(prefix);
  }

  if (acceptToken.includes("/")) {
    return mimeType === acceptToken;
  }

  return extension === `.${acceptToken.replace(/^\./, "")}`;
}

function isAllowedFileType(
  file: FileLikeForValidation,
  accept: string,
): boolean {
  const acceptTokens = getAcceptTokens(accept);

  if (acceptTokens.length === 0) {
    return true;
  }

  return acceptTokens.some((token) => matchesAcceptToken(file, token));
}

export function validateSelectedFile(
  file: FileLikeForValidation,
  options: FileValidationOptions,
): FileValidationResult {
  if (!normalizeOptionalString(file.name) || file.size <= 0) {
    return {
      ok: false,
      message: "Bitte w\u00e4hlen Sie eine g\u00fcltige Datei.",
    };
  }

  if (
    options.maxFileSizeMb !== null &&
    file.size > options.maxFileSizeMb * 1024 * 1024
  ) {
    return {
      ok: false,
      message: options.maxFileSizeMessage ?? "Datei ist zu gro\u00df.",
    };
  }

  if (!isAllowedFileType(file, options.accept)) {
    return {
      ok: false,
      message: "Dateityp ist nicht erlaubt.",
    };
  }

  return { ok: true };
}

export function sanitizeStorageSegment(value: string): string {
  const normalizedValue = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();

  return normalizedValue || "datei";
}

export function sanitizeFileName(fileName: string): string {
  const originalName =
    fileName.split(/[/\\]/).pop()?.trim() ?? "";
  const extension = getFileExtension(originalName) ?? "";
  const baseName = extension
    ? originalName.slice(0, -extension.length)
    : originalName;
  const sanitizedBaseName = sanitizeStorageSegment(baseName).slice(0, 80);
  const sanitizedExtension = extension
    .toLowerCase()
    .replace(/[^.a-z0-9]+/g, "")
    .slice(0, 16);

  return `${sanitizedBaseName || "datei"}${sanitizedExtension}`;
}

export function buildOrderStoragePath(input: {
  orderNumber: number;
  itemIndex: number;
  fieldKey: string;
  slotIndex: number;
  fileName: string;
}): string {
  return [
    "orders",
    String(input.orderNumber),
    String(Math.max(1, input.itemIndex)),
    sanitizeStorageSegment(input.fieldKey),
    `${Math.max(1, input.slotIndex + 1)}-${sanitizeFileName(input.fileName)}`,
  ].join("/");
}

export function buildSnapshotUploadFile(
  metadata: OrderStoredFileMetadata,
): ServiceConfigurationSnapshotUploadFile {
  return {
    fileName: metadata.originalName,
    originalName: metadata.originalName,
    customerLabel: metadata.customerLabel,
    fileType: getFileExtension(metadata.originalName),
    contentType: metadata.contentType,
    fileSize: metadata.size,
    fileUrl: null,
    bucket: metadata.bucket,
    path: metadata.path,
    uploadedAt: metadata.uploadedAt,
  };
}

export function getSnapshotUploadFileRecords(
  snapshot: ServiceConfigurationSnapshot,
): OrderSnapshotFileRecord[] {
  return snapshot.uploadFields.flatMap((field) =>
    field.files.map((file) => {
      const originalName =
        normalizeOptionalString(file.originalName) ??
        normalizeOptionalString(file.fileName) ??
        "Datei";
      const contentType =
        normalizeOptionalString(file.contentType) ??
        normalizeOptionalString(file.fileType);
      const bucket = normalizeOptionalString(file.bucket);
      const path = normalizeOptionalString(file.path);
      const fileUrl = normalizeOptionalString(file.fileUrl);

      return {
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
        fileName: file.fileName,
        originalName,
        customerLabel: normalizeOptionalString(file.customerLabel),
        contentType,
        size:
          typeof file.fileSize === "number" && Number.isFinite(file.fileSize)
            ? file.fileSize
            : null,
        uploadedAt: normalizeOptionalString(file.uploadedAt),
        bucket,
        path,
        fileUrl,
        isStored: Boolean(bucket && path),
      };
    }),
  );
}

export function buildAdminOrderFileDownloadHref(
  orderId: string,
  path: string,
): string {
  return `/admin/orders/${orderId}/files/download?path=${encodeURIComponent(path)}`;
}
