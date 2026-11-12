import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { AuthShell } from "@/components/admin/auth/AuthShell";
import { MfaForm } from "@/components/admin/auth/forms";

export const metadata = { title: "Bestätigen" };

export default async function MfaPage() {
  const state = await getAuthState();
  if (state.status !== "mfa") redirect(state.status === "none" ? "/admin/login" : "/admin");
  return (
    <AuthShell title="Zwei-Faktor-Bestätigung" text={`Angemeldet als ${state.email}. Bitte geben Sie den aktuellen Code ein.`}>
      <MfaForm />
    </AuthShell>
  );
}
