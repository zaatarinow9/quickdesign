import { requireShopAdmin } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { PageHeader } from "@/components/admin/ui";
import { SettingsEditor } from "@/components/shop-admin/SettingsEditor";

export const metadata = { title: "الصفحة الرئيسية والحكاية" };

export default async function ContentPage() {
  await requireShopAdmin();
  const store = await getStoreFresh();
  return (
    <>
      <PageHeader title="الصفحة الرئيسية والحكاية" description="صور السلايدر، والأقسام، ونصوص وصور «يومٌ لن ننساه»." />
      <SettingsEditor initial={store.settings} mode="content" />
    </>
  );
}
