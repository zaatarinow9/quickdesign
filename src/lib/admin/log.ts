import "server-only";
import { db } from "@/lib/supabase/admin";

/** Protokolliert eine Aktion in der Verwaltung (best effort, wirft nie). */
export async function logActivity(actor: string | null, action: string, entity: string | null, entityId: string | null, summary: string) {
  try {
    await db().from("activity_log").insert({ actor, action, entity, entity_id: entityId, summary: summary.slice(0, 500) });
  } catch {
    /* Protokoll darf nie den eigentlichen Vorgang verhindern */
  }
}

export async function logDocumentEvent(documentId: string, type: string, note: string | null, actor: string | null) {
  try {
    await db().from("document_events").insert({ document_id: documentId, type, note: note?.slice(0, 1000) ?? null, actor });
  } catch {
    /* ignore */
  }
}
