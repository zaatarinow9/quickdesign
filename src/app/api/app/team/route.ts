import { route } from "@/lib/app/auth";
import { teamMembers } from "@/lib/files/server";

export const dynamic = "force-dynamic";
export const GET = route(async () => ({ items: await teamMembers() }));
