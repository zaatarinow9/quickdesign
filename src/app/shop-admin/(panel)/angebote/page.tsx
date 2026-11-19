import { requireShopAdmin } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { PageHeader } from "@/components/admin/ui";
import { OffersEditor } from "@/components/shop-admin/OffersEditor";

export const metadata = { title: "Angebote & Rabatte" };

export default async function OffersPage() {
  await requireShopAdmin();
  const store = await getStoreFresh();
  return (
    <>
      <PageHeader title="Angebote & Rabatte" description="Pakete (3 für 75 €, 2 + 1), Mengenrabatte und Aktionen – mit Zeitraum und Geltungsbereich. Shop, Warenkorb und Kasse rechnen automatisch." />
      <OffersEditor initial={store.offers} products={store.products} />
    </>
  );
}
