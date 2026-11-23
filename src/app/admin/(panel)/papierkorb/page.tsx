import { Trash2 } from "lucide-react";
import { hasFullAccess, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { TRASH_DAYS } from "@/lib/admin/trash";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { TrashList } from "@/components/admin/TrashList";

export const metadata = { title: "Papierkorb" };

export default async function TrashPage() {
  const admin = await requireAdmin();
  const { data } = await db().from("trash_items").select("id, kind, label, detail, deleted_by, deleted_at").order("deleted_at", { ascending: false }).limit(500);
  const items = (data ?? []).map((r) => ({ ...r, expires: new Date(new Date(r.deleted_at).getTime() + TRASH_DAYS * 864e5).toISOString() }));
  return (
    <>
      <PageHeader title="Papierkorb" description={`Gelöschte Dateien, Ordner, Kunden, Aufträge, Anfragen und Angebote – ${TRASH_DAYS} Tage wiederherstellbar, danach endgültig gelöscht.`} />
      <Card padded={false}>
        {items.length ? (
          <TrashList items={items} canPurge={hasFullAccess(admin.role)} />
        ) : (
          <EmptyState icon={Trash2} title="Der Papierkorb ist leer" text="Alles, was Sie löschen, landet hier und kann mit einem Klick zurückgeholt werden." />
        )}
      </Card>
    </>
  );
}
