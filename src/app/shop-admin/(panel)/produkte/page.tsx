import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { requireShopAdmin, adminBase } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { imageOf } from "@/lib/shop/schema";
import { formatEuro } from "@/lib/documents/format";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ProductRowActions } from "@/components/shop-admin/ProductRowActions";

export const metadata = { title: "المنتجات والأسعار" };

const kindLabel: Record<string, string> = { tshirt: "تيشرت", hoodie: "هودي", flag: "علم", banner: "لافتة", foil: "ملصق فينيل", sticker: "ستيكر", other: "أخرى" };

export default async function ProductsPage() {
  await requireShopAdmin();
  const base = await adminBase();
  const store = await getStoreFresh();
  return (
    <>
      <PageHeader
        title="المنتجات والأسعار"
        description="الترتيب والظهور والأسعار والمقاسات والأحجام والصور. التعديلات تظهر في المتجر فور الحفظ."
        actions={
          <Link href={`${base}/produkte/neu`} className="adm-btn bg-[#054239] text-white hover:bg-[#0b6456]">
            <Plus className="size-4" /> منتج جديد
          </Link>
        }
      />
      {(["textil", "druck"] as const).map((cat) => {
        const list = store.products.map((p, i) => ({ p, i })).filter(({ p }) => p.category === cat);
        return (
          <Card key={cat} title={cat === "textil" ? "الملابس" : "المطبوعات (أعلام، لافتات، ملصقات، ستيكرات)"} padded={false} className="mb-6">
            {list.length ? (
              <ul className="divide-y divide-ink/[0.06]">
                {list.map(({ p, i }) => {
                  const prices = p.variants.filter((v) => v.active).map((v) => v.priceCents);
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  const img = imageOf(p);
                  return (
                    <li key={p.id} className={`flex flex-wrap items-center gap-4 px-5 py-3 ${p.active ? "" : "bg-ink/[0.02] opacity-70"}`}>
                      <Link href={`${base}/produkte/${p.id}`} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-ink/[0.04]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Package className="m-5 size-6 text-stone-dark" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`${base}/produkte/${p.id}`} className="font-medium hover:text-[#054239]">
                          {p.name.ar || p.name.de}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-dark">
                          <Badge tone="gray">{kindLabel[p.kind]}</Badge>
                          {p.colors.length ? <span>{p.colors.map((c) => c.name.ar || c.name.de).join("، ")}</span> : null}
                          <span>· {p.variants.filter((v) => v.active).length} {cat === "textil" ? "مقاسات" : "أحجام"}</span>
                          {!p.active ? <Badge tone="red">مخفي</Badge> : null}
                        </p>
                      </div>
                      <p className="ltr w-40 text-start tabular-nums">{min === max ? formatEuro(min / 100) : `${formatEuro(min / 100)} – ${formatEuro(max / 100)}`}</p>
                      <ProductRowActions id={p.id} active={p.active} featured={p.featured} first={i === 0} last={i === store.products.length - 1} />
                      <Link href={`${base}/produkte/${p.id}`} className="adm-btn adm-btn-ghost adm-btn-sm">
                        تعديل
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-5 text-sm text-stone-dark">لا توجد منتجات في هذا القسم بعد.</p>
            )}
          </Card>
        );
      })}
    </>
  );
}
