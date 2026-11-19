/** Dateien: Typen und Hilfsfunktionen (client- und serverseitig nutzbar). */

export type FileStatus = "neu" | "bearbeitung" | "freigabe" | "druckfertig" | "im_druck" | "erledigt";
/** Ablauf einer Datei in Reihenfolge */
export const fileStatuses: FileStatus[] = ["neu", "bearbeitung", "freigabe", "druckfertig", "im_druck", "erledigt"];
export const isFileStatus = (v: unknown): v is FileStatus => typeof v === "string" && (fileStatuses as string[]).includes(v);
export const fileStatusInfo: Record<FileStatus, { label: string; short: string; hint: string; dot: string; chip: string; bar: string }> = {
  neu: { label: "Neu", short: "Neu", hint: "Gerade hochgeladen", dot: "bg-sky-500", chip: "bg-sky-500/12 text-sky-800", bar: "bg-sky-500" },
  bearbeitung: { label: "In Bearbeitung", short: "Bearbeitung", hint: "Wird gestaltet / angepasst", dot: "bg-amber-400", chip: "bg-amber-500/14 text-amber-800", bar: "bg-amber-400" },
  freigabe: { label: "Freigabe Kunde", short: "Freigabe", hint: "Wartet auf Korrektur / Freigabe", dot: "bg-violet-500", chip: "bg-violet-500/12 text-violet-800", bar: "bg-violet-500" },
  druckfertig: { label: "Druckfertig", short: "Druckfertig", hint: "Freigegeben, bereit für den Druck", dot: "bg-emerald-500", chip: "bg-emerald-500/14 text-emerald-800", bar: "bg-emerald-500" },
  im_druck: { label: "Im Druck", short: "Druck", hint: "Wird gedruckt / produziert", dot: "bg-accent", chip: "bg-accent/12 text-accent", bar: "bg-accent" },
  erledigt: { label: "Erledigt", short: "Erledigt", hint: "Fertig – keine Arbeit mehr nötig", dot: "bg-stone-light", chip: "bg-ink/[0.07] text-stone-dark", bar: "bg-stone" },
};
/** Fortschritt in Prozent (für Balken) */
export const fileProgress = (s: FileStatus) => Math.round((fileStatuses.indexOf(s) / (fileStatuses.length - 1)) * 100);
export const nextFileStatus = (s: FileStatus): FileStatus | null => fileStatuses[fileStatuses.indexOf(s) + 1] ?? null;

/** Ein Upload darf bis zu 5 GB groß sein (Grenze für einen einzelnen PUT bei R2) */
export const MAX_FILE_SIZE = 5 * 1024 ** 3;
/** Dateien pro Ablage-Vorgang (auch ganze Ordner) */
export const MAX_FILES_PER_UPLOAD = 2000;
/** Dateien pro Server-Aufruf beim Vorbereiten/Bestätigen */
export const UPLOAD_CHUNK = 25;

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
  folder: string;
  category: string | null;
  status_changed_at?: string | null;
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


/* ------------------------------ Ordner ------------------------------ */

/** Ordnerpfad bereinigen: "a//b/ " → "a/b", keine "..", max. 10 Ebenen */
export function normalizeFolder(path: string | null | undefined): string {
  return (path ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .map((seg) => seg.replace(/[\u0000-\u001f<>:"|?*]/g, "").trim().slice(0, 80))
    .filter((seg) => seg && seg !== "." && seg !== "..")
    .slice(0, 10)
    .join("/")
    .slice(0, 500);
}

export const joinFolder = (...parts: (string | null | undefined)[]) => normalizeFolder(parts.filter(Boolean).join("/"));
export const parentFolder = (path: string) => path.split("/").slice(0, -1).join("/");
export const folderName = (path: string) => path.split("/").pop() || "Alle Dateien";

/* ------------------------------ Vorschau ------------------------------ */

export type ViewerKind = "image" | "tiff" | "heic" | "psd" | "pdf" | "eps" | "video" | "audio" | "text" | "csv" | "office" | "zip" | "font" | "none";

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function viewerKind(name: string, type?: string | null): ViewerKind {
  const e = ext(name);
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp", "ico"].includes(e)) return "image";
  if (["tif", "tiff"].includes(e)) return "tiff";
  if (["heic", "heif"].includes(e)) return "heic";
  if (["psd", "psb"].includes(e)) return "psd";
  // Illustrator-Dateien sind (mit PDF-Kompatibilität, Standard) gleichzeitig PDFs
  if (["pdf", "ai"].includes(e)) return "pdf";
  if (["eps", "ps"].includes(e)) return "eps";
  if (["mp4", "webm", "mov", "m4v", "ogv"].includes(e)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(e)) return "audio";
  if (["csv", "tsv"].includes(e)) return "csv";
  if (["txt", "md", "json", "xml", "html", "htm", "css", "js", "ts", "log", "ini", "yml", "yaml", "plt", "dxf", "gcode", "nc", "rtf"].includes(e)) return "text";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"].includes(e)) return "office";
  if (["zip"].includes(e)) return "zip";
  if (["ttf", "otf", "woff", "woff2"].includes(e)) return "font";
  if (type?.startsWith("image/")) return "image";
  if (type?.startsWith("video/")) return "video";
  if (type?.startsWith("audio/")) return "audio";
  if (type?.startsWith("text/")) return "text";
  return "none";
}

/** Bilder, die der Browser direkt als Vorschaubild anzeigen kann */
export const thumbnailable = (name: string) => ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp"].includes(ext(name));

/* ------------------------------ Organisation ------------------------------ */

export const fileCategories = ["Druckdaten", "Entwurf", "Korrektur", "Logo", "Vektor", "Foto", "Schrift", "Dokument", "Sonstiges"] as const;

export const folderColors = ["#df1986", "#2fa7df", "#f2b705", "#16a34a", "#7c3aed", "#ea580c", "#64748b"] as const;

/** Heutiges Datum als Präfix: "2026-11-19" */
export const datePrefix = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

export type FolderEntry = { path: string; name: string; fileCount: number; totalSize: number; lastUpload: string | null; color: string | null; customerId: string | null };

export type SortKey = "name" | "neu" | "alt" | "groesse" | "typ";
export const sortLabels: Record<SortKey, string> = { name: "Name A–Z", neu: "Neueste zuerst", alt: "Älteste zuerst", groesse: "Größte zuerst", typ: "Dateityp" };
export const isSortKey = (v: unknown): v is SortKey => typeof v === "string" && v in sortLabels;
export type ViewMode = "raster" | "liste";

/* ------------------------------ Druck-Tagesordner ------------------------------ */

export const PRINT_ROOT = "Druck";
/** Tagesordner für Druckdaten, z. B. "Druck/2026-11-19" */
export const printFolderFor = (date: string) => `${PRINT_ROOT}/${date}`;
export const isPrintDayFolder = (path: string) => /^Druck\/\d{4}-\d{2}-\d{2}$/.test(path);
export function printDayLabel(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(d);
}
