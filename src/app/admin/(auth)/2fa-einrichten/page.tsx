import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { signOut } from "@/app/admin/auth-actions";
import { AuthShell } from "@/components/admin/auth/AuthShell";
import { EnrollTotp } from "@/components/admin/SecurityForms";

export const metadata = { title: "2FA einrichten" };

export default async function EnrollPage() {
  const state = await getAuthState();
  if (state.status === "none") redirect("/admin/login");
  if (state.status === "mfa") redirect("/admin/login/bestaetigen");
  if (state.status === "ok") redirect("/admin");
  return (
    <AuthShell title="Zwei-Faktor-Anmeldung" text="Zum Schutz der Kundendaten ist eine Zwei-Faktor-Anmeldung vorgeschrieben. Bitte richten Sie sie jetzt ein.">
      <EnrollTotp />
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/admin" className="text-accent hover:underline">
          Weiter zur Verwaltung
        </Link>
        <form action={signOut}>
          <button className="text-stone-dark hover:text-ink">Abmelden</button>
        </form>
      </div>
    </AuthShell>
  );
}
