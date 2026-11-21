import { AppError, idOf, route } from "@/lib/app/auth";
import { env } from "@/lib/env";
import { documentEvents, getDocument } from "@/lib/documents/queries";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, _u, ctx) => {
  const id = idOf(await ctx.params);
  const doc = await getDocument(id);
  if (!doc) throw new AppError(404, "not_found");
  const events = await documentEvents(id);
  const d = doc as unknown as Record<string, unknown>;
  const token = d.share_token as string | undefined;
  const { share_token: _s, accepted_ip_hash: _ip, ...rest } = d;
  void _s;
  void _ip;
  return {
    item: rest,
    events,
    pdfUrl: token ? `${env.siteUrl}/dokument/${token}/pdf` : null,
    viewUrl: token ? `${env.siteUrl}/dokument/${token}` : null,
  };
});
