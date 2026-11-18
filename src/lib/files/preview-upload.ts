"use client";

import { confirmPreview, requestPreviewUpload } from "@/app/admin/file-actions";
import type { Previews } from "./preview-client";

async function put(url: string, blob: Blob) {
  const r = await fetch(url, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: blob });
  if (!r.ok) throw new Error(`Vorschau-Upload ${r.status}`);
}

/** Vorschau + Miniatur zu R2 hochladen und an der Datei speichern */
export async function savePreviews(fileId: string, p: Previews): Promise<boolean> {
  try {
    const urls = await requestPreviewUpload(fileId);
    if (!urls.thumbUrl || !urls.previewUrl) return false;
    await Promise.all([put(urls.thumbUrl, p.thumb), put(urls.previewUrl, p.preview)]);
    await confirmPreview({ id: fileId, width: p.width, height: p.height, pages: p.pages ?? null });
    return true;
  } catch {
    return false;
  }
}
