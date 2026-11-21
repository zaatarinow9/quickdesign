import { route } from "@/lib/app/auth";
import { listAppointments, listProjects } from "@/lib/projects/server";

export const dynamic = "force-dynamic";
const day = /^\d{4}-\d{2}-\d{2}$/;

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from && to && day.test(from) && day.test(to)) return { items: await listAppointments(from, to) };
  const scope = url.searchParams.get("scope");
  const kind = url.searchParams.get("kind");
  const items = await listProjects({
    doneOnly: scope === "done",
    includeDone: scope === "all",
    q: url.searchParams.get("q")?.slice(0, 100) || undefined,
    kind: kind === "auftrag" || kind === "aufgabe" ? kind : undefined,
  });
  return { items };
});
