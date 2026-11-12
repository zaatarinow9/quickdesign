import "server-only";
import { documentFilename } from "./format";
import { renderDocumentPdf } from "./pdf";
import type { Doc } from "./queries";
import { getSettings } from "@/lib/settings/server";

export async function pdfResponse(doc: Doc, download: boolean) {
  const pdf = await renderDocumentPdf(doc, await getSettings());
  const name = documentFilename(doc);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
