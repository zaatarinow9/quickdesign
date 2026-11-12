import { AuthShell } from "@/components/admin/auth/AuthShell";
import { ForgotForm } from "@/components/admin/auth/forms";

export const metadata = { title: "Passwort vergessen" };

export default function ForgotPage() {
  return (
    <AuthShell title="Passwort vergessen" text="Wir senden Ihnen einen Link, mit dem Sie ein neues Passwort festlegen können.">
      <ForgotForm />
    </AuthShell>
  );
}
