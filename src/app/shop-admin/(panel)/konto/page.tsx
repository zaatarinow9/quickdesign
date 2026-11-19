import { requireShopAdmin } from "@/lib/shop/admin";
import { Card, PageHeader } from "@/components/admin/ui";
import { PasswordForm } from "@/components/shop-admin/PasswordForm";

export const metadata = { title: "الحساب وكلمة السر" };

export default async function AccountPage() {
  const admin = await requireShopAdmin();
  return (
    <>
      <PageHeader title="الحساب وكلمة السر" description="حساب لوحة تحكم المتجر – منفصل تماماً عن إدارة الموقع الرئيسي." />
      <Card title={admin.email}>
        <PasswordForm />
      </Card>
    </>
  );
}
