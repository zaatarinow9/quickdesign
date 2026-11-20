import { requireShopAdmin } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { PageHeader } from "@/components/admin/ui";
import { MotifsEditor } from "@/components/shop-admin/MotifsEditor";

export const metadata = { title: "تصاميم الطباعة" };

export default async function MotifsPage() {
  await requireShopAdmin();
  const store = await getStoreFresh();
  const users = store.products.filter((p) => p.custom.enabled).map((p) => p.name.ar || p.name.de);
  return (
    <>
      <PageHeader
        title="تصاميم الطباعة"
        description={`مكتبة التصاميم التي يختار منها الزبون في ${users.length ? users.join(" و") : "منتجات التصميم الحر"}. ارفع ملف PNG بخلفية شفافة – نسخة للأقمشة الفاتحة وأخرى للأقمشة الداكنة (اختياري).`}
      />
      <MotifsEditor initial={store.motifs} />
    </>
  );
}
