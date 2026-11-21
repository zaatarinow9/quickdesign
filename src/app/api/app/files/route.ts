import { route } from "@/lib/app/auth";
import { fileCounts, listFiles, thumbnailUrls } from "@/lib/files/server";
import { isFileStatus } from "@/lib/files/shared";

export const dynamic = "force-dynamic";

export const GET = route(async (req, u) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const mine = url.searchParams.get("mine") === "1";
  const items = await listFiles({
    status: isFileStatus(status) ? status : undefined,
    q: url.searchParams.get("q")?.slice(0, 100) || undefined,
    assignedTo: mine ? u.email : undefined,
    limit: 200,
  });
  const visible = status ? items : items.filter((f) => f.status !== "erledigt");
  const [thumbs, counts] = await Promise.all([thumbnailUrls(visible.slice(0, 120)), fileCounts()]);
  return { items: visible.map((f) => ({ ...f, thumb: thumbs[f.id] ?? null })), counts };
});
