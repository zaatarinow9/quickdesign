import { requireFullAccess } from "@/lib/auth";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/documents/format";
import { updateUser } from "@/app/admin/user-actions";
import { InviteForm } from "@/components/admin/InviteForm";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { Badge, Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Benutzer & Rechte" };

export default async function UsersPage() {
  const admin = await requireFullAccess();
  const { data: users } = await db().from("admin_users").select("*").order("created_at");
  return (
    <>
      <PageHeader title="Benutzer & Rechte" description="Mitarbeiter einladen und Zugriffsrechte verwalten. Inhaber werden über die Umgebungsvariable ADMIN_EMAILS festgelegt." />
      <Card title="Mitarbeiter einladen">
        <InviteForm canInviteAdmin={admin.role === "owner"} />
        <p className="mt-3 text-xs text-stone-dark">Mitarbeiter: Anfragen, Kunden, Angebote, Rechnungen, Marketing. Administratoren zusätzlich: Leistungskatalog, Einstellungen, Benutzer, Exporte, Löschungen.</p>
      </Card>
      <Card className="mt-6" title="Zugänge" padded={false}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rolle</th>
              <th>Status</th>
              <th className="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {env.adminEmails.map((e) => (
              <tr key={e}>
                <td>
                  <span className="font-medium">{e}</span>
                </td>
                <td><Badge tone="pink">Inhaber</Badge></td>
                <td><Badge tone="green">aktiv</Badge></td>
                <td className="text-right text-xs text-stone-dark">über ADMIN_EMAILS</td>
              </tr>
            ))}
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="block font-medium">{u.full_name ?? u.email}</span>
                  <span className="block text-xs text-stone-dark">{u.email}</span>
                </td>
                <td>
                  <form action={updateUser} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="action" value="role" />
                    <select name="role" defaultValue={u.role} className="adm-input h-8 w-auto text-xs" disabled={u.role === "admin" && admin.role !== "owner"}>
                      <option value="manager">Mitarbeiter</option>
                      {admin.role === "owner" || u.role === "admin" ? <option value="admin">Administrator</option> : null}
                    </select>
                    <button className="adm-btn adm-btn-ghost adm-btn-sm">OK</button>
                  </form>
                </td>
                <td>
                  {!u.active ? <Badge tone="gray">deaktiviert</Badge> : u.accepted_at ? <Badge tone="green">aktiv</Badge> : <Badge tone="amber">eingeladen {formatDateTime(u.created_at).split(",")[0]}</Badge>}
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <form action={updateUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="action" value={u.active ? "deactivate" : "activate"} />
                      <button className="adm-btn adm-btn-ghost adm-btn-sm">{u.active ? "Sperren" : "Entsperren"}</button>
                    </form>
                    <form action={updateUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="action" value="delete" />
                      <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm" message={`Zugang von ${u.email} endgültig löschen?`}>
                        Löschen
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
