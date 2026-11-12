import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { env } from "@/lib/env";
import { AuthShell } from "@/components/admin/auth/AuthShell";
import { LoginForm } from "@/components/admin/auth/forms";
import { Notice } from "@/components/admin/ui";

export const metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  if (!env.databaseConfigured) {
    return (
      <AuthShell title="Verwaltung" text="Die Datenbank ist noch nicht verbunden.">
        <Notice tone="warn">Bitte NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY und SUPABASE_SECRET_KEY in Vercel eintragen.</Notice>
      </AuthShell>
    );
  }
  const state = await getAuthState();
  if (state.status === "ok") redirect("/admin");
  if (state.status === "mfa") redirect("/admin/login/bestaetigen");
  const { fehler } = await searchParams;
  return (
    <AuthShell title="Willkommen zurück" text="Melden Sie sich an, um die Verwaltung zu öffnen.">
      {fehler ? (
        <div className="mb-4">
          <Notice tone="error">Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.</Notice>
        </div>
      ) : null}
      <LoginForm />
    </AuthShell>
  );
}
