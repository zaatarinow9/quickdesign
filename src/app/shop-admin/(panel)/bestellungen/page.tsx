import { requireShopAdmin, adminBase } from "@/lib/shop/admin";
import { db } from "@/lib/supabase/admin";
import { setOrderStatus } from "../../actions";
import { FilterTabs, PageHeader } from "@/components/admin/ui";
import { OrdersList, orderLabels, type OrderRow } from "@/components/shop-admin/OrdersList";

export const metadata = { title: "الطلبات" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireShopAdmin();
  const base = await adminBase();
  const { status } = await searchParams;
  let q = db().from("shop_orders").select("*").order("created_at", { ascending: false }).limit(500);
  if (status && orderLabels[status]) q = q.eq("status", status);
  const { data } = await q;
  const { data: all } = await db().from("shop_orders").select("status");
  const counts = (all ?? []).reduce<Record<string, number>>((m, r) => ({ ...m, [r.status as string]: (m[r.status as string] ?? 0) + 1 }), {});
  return (
    <>
      <PageHeader title="الطلبات" description="كل الطلبات المدفوعة من المتجر. غيّر الحالة عند الطباعة أو الشحن أو الاستلام." />
      <div className="mb-5">
        <FilterTabs
          active={status ?? "alle"}
          items={[
            { key: "alle", label: "الكل", href: `${base}/bestellungen`, count: (all ?? []).length },
            ...Object.entries(orderLabels).map(([k, v]) => ({ key: k, label: v, href: `${base}/bestellungen?status=${k}`, count: counts[k] ?? 0 })),
          ]}
        />
      </div>
      <OrdersList orders={(data ?? []) as OrderRow[]} action={setOrderStatus} />
    </>
  );
}
