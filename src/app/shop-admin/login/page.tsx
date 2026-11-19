import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { adminBase, getShopAdmin } from "@/lib/shop/admin";
import { ShopLoginForm } from "@/components/shop-admin/LoginForm";

export const metadata = { title: "Anmelden" };

export default async function ShopLoginPage() {
  if (await getShopAdmin()) redirect(await adminBase());
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0b0b0c] p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-[180px]" />
          <span className="rounded-md bg-paper/10 px-2 py-1 text-xs font-semibold uppercase tracking-wider">Shop 8.12.</span>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 w-[620px] -rotate-6 opacity-90">
          <div className="h-[140px] bg-[#0b6b3a]" />
          <div className="relative h-[140px] bg-[#ece9e2]">
            <div className="absolute inset-0 flex items-center justify-center gap-16 text-7xl text-[#c4161c]">★ ★ ★</div>
          </div>
          <div className="h-[140px] bg-[#151515] ring-1 ring-paper/10" />
        </div>
        <div className="relative">
          <p className="display-md max-w-md">Produkte, Preise und Angebote – alles an einem Ort.</p>
          <p className="mt-5 max-w-sm text-paper/55">Die Verwaltung für den Shop zum Tag der Befreiung.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 w-[150px] lg:hidden" />
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight">Shop-Verwaltung</h1>
          <p className="mt-2 text-stone-dark">Melden Sie sich mit Ihrem Shop-Zugang an.</p>
          <div className="mt-8">
            <ShopLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
