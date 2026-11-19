import { headers } from "next/headers";
import { adminBase, requireShopAdmin } from "@/lib/shop/admin";
import { db } from "@/lib/supabase/admin";
import { SHOP_HOSTS, SHOP_URL } from "@/lib/shop/config";
import { shopSignOut } from "../actions";
import { ShopSidebar } from "@/components/shop-admin/ShopSidebar";

export default async function ShopPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireShopAdmin();
  const base = await adminBase();
  const { count } = await db().from("shop_orders").select("id", { count: "exact", head: true }).in("status", ["bezahlt", "in_produktion"]);
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0];
  const shopUrl = SHOP_HOSTS.includes(host) ? "/de" : host.includes("quickdesign24.de") ? SHOP_URL : "/shop/de";
  return (
    <div className="min-h-dvh lg:pr-[17rem]">
      <style>{`.shop-tricolor-adm{background:linear-gradient(90deg,#0b6b3a 0 33.3%,#fff 33.3% 66.6%,#111 66.6%)}`}</style>
      <ShopSidebar base={base} email={admin.email} openOrders={count ?? 0} shopUrl={shopUrl} signOut={shopSignOut} />
      <main className="mx-auto w-full max-w-[80rem] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
