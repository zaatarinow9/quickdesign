import { redirect } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase/server";
import { AuthShell } from "@/components/admin/auth/AuthShell";
import { PasswordForm } from "@/components/admin/auth/forms";

export const metadata = { title: "Passwort festlegen" };

export default async function PasswordPage() {
  const supabase = await supabaseAuth();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login?fehler=1");
  return (
    <AuthShell title="Passwort festlegen" text={`Für ${data.user.email}`}>
      <PasswordForm />
    </AuthShell>
  );
}
