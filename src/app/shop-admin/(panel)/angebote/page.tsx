import { requireShopAdmin } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { PageHeader } from "@/components/admin/ui";
import { OffersEditor } from "@/components/shop-admin/OffersEditor";

export const metadata = { title: "العروض والخصومات" };

export default async function OffersPage() {
  await requireShopAdmin();
  const store = await getStoreFresh();
  return (
    <>
      <PageHeader title="العروض والخصومات" description="باقات (3 بـ 75 €، أو 2 + 1)، وخصم الكميات، وعروض بنسبة – مع مدة ونطاق لكل عرض. المتجر والسلة وصفحة الدفع يحسبون تلقائياً." />
      <OffersEditor initial={store.offers} products={store.products} />
    </>
  );
}
