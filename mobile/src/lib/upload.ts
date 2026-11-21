import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { api } from "./api";

type Picked = { uri: string; name: string; size: number; type: string };

/** Datei auswählen (Kamera, Fotos oder Dateien) */
export async function pickFile(source: "camera" | "library" | "document"): Promise<Picked | null> {
  if (source === "document") {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets?.[0]) return null;
    const a = r.assets[0];
    return { uri: a.uri, name: a.name, size: a.size ?? 0, type: a.mimeType ?? "application/octet-stream" };
  }
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images", "videos"], quality: 0.9, allowsEditing: false };
  const r = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const ext = (a.mimeType ?? "image/jpeg").split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return { uri: a.uri, name: a.fileName ?? `Foto-${stamp}.${ext}`, size: a.fileSize ?? 0, type: a.mimeType ?? "image/jpeg" };
}

/** Hochladen: Link holen → direkt in den Speicher → bestätigen */
export async function uploadFile(file: Picked, opts: { folder?: string; projectId?: string | null; message?: string | null } = {}) {
  const blob = await (await fetch(file.uri)).blob();
  const size = file.size || blob.size;
  const start = await api<{ id: string; url: string; contentType: string }>("/files/upload", {
    method: "POST",
    body: { name: file.name, size, type: file.type, folder: opts.folder ?? `App-Uploads/${new Date().toISOString().slice(0, 10)}`, projectId: opts.projectId ?? null, message: opts.message ?? null },
  });
  const put = await fetch(start.url, { method: "PUT", headers: { "Content-Type": start.contentType }, body: blob });
  if (!put.ok) throw new Error("upload");
  await api("/files/upload", { method: "PUT", body: { id: start.id } });
  return start.id;
}
