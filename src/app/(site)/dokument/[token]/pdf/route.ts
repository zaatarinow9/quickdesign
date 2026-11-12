import { getDocumentByToken } from "@/lib/documents/queries";
import { pdfResponse } from "@/lib/documents/pdf-response";
import { clientIpHash, rateLimit } from "@/lib/security";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await rateLimit(`doc-pdf:${await clientIpHash()}`, 60, 3600))) return new Response("Zu viele Anfragen", { status: 429 });
  const doc = await getDocumentByToken(token);
  if (!doc) return new Response("Nicht gefunden", { status: 404 });
  return pdfResponse(doc, false);
}
