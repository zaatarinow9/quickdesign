import { requireShopAdmin } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { PageHeader } from "@/components/admin/ui";
import { SettingsEditor } from "@/components/shop-admin/SettingsEditor";

export const metadata = { title: "Versand, Express & Vorbestellung" };

export default async function ShippingPage() {
  await requireShopAdmin();
  const store = await getStoreFresh();
  return (
    <>
      <PageHeader title="Versand, Express & Vorbestellung" description="Versandkosten, Express-Aufpreis, Abholung, Vorbestellrabatt und wichtige Termine." />
      <SettingsEditor initial={store.settings} mode="shipping" />
    </>
  );
}
