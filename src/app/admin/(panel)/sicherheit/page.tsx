import { redirect } from "next/navigation";
import { getAuthState, roleLabels } from "@/lib/auth";
import { formatDateTime } from "@/lib/documents/format";
import { removeFactor } from "@/app/admin/auth-actions";
import { EnrollTotp, PasswordChange } from "@/components/admin/SecurityForms";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { Badge, Card, Notice, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Sicherheit" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ pflicht?: string }> }) {
  const state = await getAuthState();
  if (state.status !== "ok") redirect("/admin/login");
  const admin = state.admin;
  const factors = state.factors;
  const mandatory = !!(await searchParams).pflicht;
  return (
    <>
      <PageHeader title="Sicherheit & 2FA" description={`${admin.email} · ${roleLabels[admin.role]}`} />
      {mandatory && !factors.length ? (
        <div className="mb-6">
          <Notice tone="warn">Die Zwei-Faktor-Anmeldung ist verpflichtend. Bitte richten Sie sie jetzt ein, um die Verwaltung zu nutzen.</Notice>
        </div>
      ) : null}
      <Card title="Zwei-Faktor-Anmeldung (TOTP)">
        {factors.length ? (
          <ul className="space-y-3">
            {factors.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">
                  <Badge tone="green">aktiv</Badge> <span className="ml-2">{f.friendly_name ?? "Authenticator"}</span>
                  {f.created_at ? <span className="ml-2 text-xs text-stone-dark">seit {formatDateTime(f.created_at)}</span> : null}
                </span>
                <form action={removeFactor}>
                  <input type="hidden" name="factorId" value={f.id} />
                  <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm" message="Zwei-Faktor-Anmeldung wirklich entfernen?">
                    Entfernen
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <EnrollTotp />
        )}
      </Card>
      <Card className="mt-6" title="Passwort ändern">
        <PasswordChange />
      </Card>
    </>
  );
}
