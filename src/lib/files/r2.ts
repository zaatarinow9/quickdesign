import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 (S3-kompatibel). Der Server signiert nur kurzlebige Links –
 * Up- und Downloads laufen direkt zwischen Browser und R2 (keine Größenbegrenzung durch Vercel).
 */
function cfg() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = process.env.R2_BUCKET?.trim() || "quickdesign-dateien";
  const jurisdiction = process.env.R2_JURISDICTION?.trim().toLowerCase() ?? "";
  return { accountId, accessKeyId, secretAccessKey, bucket, jurisdiction };
}

export const isR2Configured = () => {
  const c = cfg();
  return !!(c.accountId && c.accessKeyId && c.secretAccessKey && c.bucket);
};

let client: AwsClient | null = null;
function aws() {
  const c = cfg();
  if (!client) client = new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, service: "s3", region: "auto" });
  return client;
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

function objectUrl(key: string) {
  const c = cfg();
  const host = `${c.accountId}.${c.jurisdiction === "eu" ? "eu." : c.jurisdiction === "fedramp" ? "fedramp." : ""}r2.cloudflarestorage.com`;
  return `https://${host}/${c.bucket}/${encodeKey(key)}`;
}

/** Signierter Upload-Link (PUT), gültig `seconds` Sekunden */
export async function presignUpload(key: string, contentType: string, seconds = 3600): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(seconds));
  const signed = await aws().sign(url.toString(), { method: "PUT", headers: { "content-type": contentType }, aws: { signQuery: true } });
  return signed.url;
}

/** Signierter Download-Link (GET) – als Anhang oder zur Ansicht im Browser */
export async function presignDownload(key: string, filename: string, opts: { inline?: boolean; seconds?: number } = {}): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(opts.seconds ?? 600));
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  url.searchParams.set("response-content-disposition", `${opts.inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  const signed = await aws().sign(url.toString(), { method: "GET", aws: { signQuery: true } });
  return signed.url;
}

/** Größe prüfen (null = Objekt existiert nicht) */
export async function headObject(key: string): Promise<{ size: number; contentType: string | null } | null> {
  const res = await aws().fetch(objectUrl(key), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 HEAD ${res.status}`);
  return { size: Number(res.headers.get("content-length") ?? 0), contentType: res.headers.get("content-type") };
}

export async function deleteObject(key: string): Promise<void> {
  const res = await aws().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${res.status}`);
}
