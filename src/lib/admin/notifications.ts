import "server-only";
import { db } from "@/lib/supabase/admin";

export type AdminNotification = { id: number; category: string; title: string; body: string; href: string | null; at: string; unread: boolean };

/** App-Links (Mitarbeiter-App) in Verwaltungs-Links übersetzen */
function toAdminHref(link: string | null): string | null {
  if (!link) return null;
  const [, kind, id] = link.split("/");
  if (!id) return null;
  if (kind === "inquiries") return `/admin/anfragen/${id}`;
  if (kind === "projects") return `/admin/projekte/${id}`;
  if (kind === "files") return `/admin/dateien/${id}/ansicht`;
  if (kind === "shop") return `/admin/shop`;
  if (kind === "tasks") return `/admin/aufgaben?wer=alle&aufgabe=${id}`;
  return null;
}

/** Glocke: letzte Benachrichtigungen (für alle oder gezielt an mich) */
export async function getNotifications(email: string): Promise<{ items: AdminNotification[]; unread: number }> {
  const me = email.toLowerCase();
  const client = db();
  const [{ data }, { data: state }] = await Promise.all([
    client.from("staff_notifications").select("id, category, title_de, body_de, link, created_at").or(`target_email.is.null,target_email.eq.${me}`).order("created_at", { ascending: false }).limit(30),
    client.from("staff_read_state").select("last_read_at").eq("user_email", me).maybeSingle(),
  ]);
  const last = state?.last_read_at ?? "1970-01-01";
  const items = (data ?? []).map((n) => ({ id: n.id as number, category: n.category as string, title: n.title_de as string, body: (n.body_de as string) ?? "", href: toAdminHref(n.link as string | null), at: n.created_at as string, unread: (n.created_at as string) > last }));
  return { items, unread: items.filter((i) => i.unread).length };
}
