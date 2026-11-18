/** Dateien: Typen und Hilfsfunktionen (client- und serverseitig nutzbar). */

export type FileStatus = "bearbeitung" | "druckfertig" | "erledigt";
export const fileStatuses: FileStatus[] = ["bearbeitung", "druckfertig", "erledigt"];
export const isFileStatus = (v: unknown): v is FileStatus => typeof v === "string" && (fileStatuses as string[]).includes(v);
export const fileStatusInfo: Record<FileStatus, { label: string; tone: "amber" | "green" | "gray" }> = {
  bearbeitung: { label: "In Bearbeitung", tone: "amber" },
  druckfertig: { label: "Druckfertig", tone: "green" },
  erledigt: { label: "Erledigt", tone: "gray" },
};

/** Ein Upload darf bis zu 5 GB groß sein (Grenze für einen einzelnen PUT bei R2) */
export const MAX_FILE_SIZE = 5 * 1024 ** 3;
export const MAX_FILES_PER_UPLOAD = 30;

export type StoredFile = {
  id: string;
  name: string;
  size: number;
  content_type: string | null;
  project_id: string | null;
  message: string | null;
  status: FileStatus;
  assigned_to: string | null;
  uploaded_by: string | null;
  created_at: string;
  project?: { id: string; number: string; title: string; customer_name: string; company_name: string | null } | null;
};

export function formatBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: i >= 2 ? 1 : 0 }).format(n / 1024 ** i)} ${u[i]}`;
}

export type FileKind = "bild" | "pdf" | "grafik" | "dokument" | "archiv" | "video" | "sonstiges";

export function fileKind(name: string, type?: string | null): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "tif", "tiff", "bmp"].includes(ext) || type?.startsWith("image/")) return "bild";
  if (ext === "pdf") return "pdf";
  if (["ai", "eps", "svg", "psd", "indd", "cdr", "afdesign", "afphoto", "afpub", "dxf", "plt"].includes(ext)) return "grafik";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archiv";
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext) || type?.startsWith("video/")) return "video";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "odt", "rtf"].includes(ext)) return "dokument";
  return "sonstiges";
}

export const previewable = (name: string, type?: string | null) => {
  const k = fileKind(name, type);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return (k === "bild" && !["tif", "tiff", "heic", "psd"].includes(ext)) || k === "pdf";
};
