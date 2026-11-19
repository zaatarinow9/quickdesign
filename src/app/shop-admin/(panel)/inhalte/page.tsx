import { requireShopAdmin } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { PageHeader } from "@/components/admin/ui";
import { SettingsEditor } from "@/components/shop-admin/SettingsEditor";

export const metadata = { title: "Startseite & Geschichte" };

export default async function ContentPage() {
  await requireShopAdmin();
  const store = await getStoreFresh();
  return (
    <>
      <PageHeader title="Startseite & Geschichte" description="Texte und Bilder für den großen Bereich oben und die Geschichte „Ein Tag, den wir nie vergessen“ – auf Deutsch und Arabisch." />
      <SettingsEditor initial={store.settings} mode="content" />
    </>
  );
}
