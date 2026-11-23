import "server-only";
import { db } from "@/lib/supabase/admin";
import type { TimeEntry } from "./shared";

const COLS = "*, customer:customers(id, name, company_name)";
const norm = (r: Record<string, unknown>): TimeEntry => ({ ...(r as unknown as TimeEntry), customer: (Array.isArray(r.customer) ? r.customer[0] : r.customer) as TimeEntry["customer"] });

export async function runningEntry(email: string): Promise<TimeEntry | null> {
  const { data } = await db().from("time_entries").select(COLS).eq("user_email", email.toLowerCase()).is("ended_at", null).maybeSingle();
  return data ? norm(data) : null;
}

export async function listEntries(opts: { customerId?: string; user?: string; since?: string; limit?: number } = {}): Promise<TimeEntry[]> {
  let q = db().from("time_entries").select(COLS).order("started_at", { ascending: false }).limit(opts.limit ?? 300);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts.user) q = q.eq("user_email", opts.user);
  if (opts.since) q = q.gte("started_at", opts.since);
  const { data } = await q;
  return (data ?? []).map((r) => norm(r as Record<string, unknown>));
}
