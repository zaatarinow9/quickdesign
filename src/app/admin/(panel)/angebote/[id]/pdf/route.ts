import { getAdmin } from "@/lib/auth";
import { getDocument } from "@/lib/documents/queries";
import { pdfResponse } from "@/lib/documents/pdf-response";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return new Response("Nicht angemeldet", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Nicht gefunden", { status: 404 });
  const doc = await getDocument(id);
  if (!doc || doc.kind !== "angebot") return new Response("Nicht gefunden", { status: 404 });
  return pdfResponse(doc, new URL(request.url).searchParams.has("download"));
}
