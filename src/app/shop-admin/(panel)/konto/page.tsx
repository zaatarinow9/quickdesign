import { requireShopAdmin } from "@/lib/shop/admin";
import { Card, PageHeader } from "@/components/admin/ui";
import { PasswordForm } from "@/components/shop-admin/PasswordForm";

export const metadata = { title: "Konto & Passwort" };

export default async function AccountPage() {
  const admin = await requireShopAdmin();
  return (
    <>
      <PageHeader title="Konto & Passwort" description="Zugang zur Shop-Verwaltung. Dieser Zugang ist vom Hauptbereich der Website getrennt." />
      <Card title={admin.email}>
        <PasswordForm />
      </Card>
    </>
  );
}
