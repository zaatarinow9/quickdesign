import { requireShopAdmin } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { PageHeader } from "@/components/admin/ui";
import { SettingsEditor } from "@/components/shop-admin/SettingsEditor";

export const metadata = { title: "الشحن والسريع والطلب المسبق" };

export default async function ShippingPage() {
  await requireShopAdmin();
  const store = await getStoreFresh();
  return (
    <>
      <PageHeader title="الشحن والسريع والطلب المسبق" description="أسعار الشحن، والشحن السريع، والاستلام، وخصم الطلب المسبق، والمواعيد المهمة." />
      <SettingsEditor initial={store.settings} mode="shipping" />
    </>
  );
}
