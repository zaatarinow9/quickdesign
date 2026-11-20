import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShopAdmin, adminBase } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { defaultStore } from "@/lib/shop/defaults";
import type { Product } from "@/lib/shop/schema";
import { PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/shop-admin/ProductEditor";

export const metadata = { title: "تعديل منتج" };

const blank: Product = {
  id: "neues-produkt",
  active: false,
  featured: false,
  category: "textil",
  kind: "tshirt",
  name: { de: "", ar: "" },
  tagline: { de: "", ar: "" },
  description: { de: "", ar: "" },
  details: [],
  colors: [{ id: "schwarz", name: { de: "Schwarz", ar: "أسود" }, hex: "#1d1d1f", image: "", detail: "", blankFront: "", blankBack: "" }],
  image: "",
  detail: "",
  gallery: [],
  variants: ["S", "M", "L", "XL", "XXL"].map((s) => ({ id: s, label: { de: s, ar: s }, priceCents: 2990, image: "", active: true })),
  sizeChart: [],
  maxQty: 50,
  custom: { enabled: false, extraSideCents: 0 },
};

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireShopAdmin();
  const { id } = await params;
  const base = await adminBase();
  const isNew = id === "neu";
  const store = await getStoreFresh();
  const product = isNew ? blank : store.products.find((p) => p.id === id);
  if (!product) notFound();
  const defaults = defaultStore.products.find((p) => p.id === product.id) ?? null;
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`${base}/produkte`} className="hover:text-ink">→ المنتجات</Link>}
        title={isNew ? "منتج جديد" : product.name.ar || product.name.de || "منتج"}
        description={isNew ? "أضف منتجاً جديداً – يظهر في المتجر بعد تفعيل «ظاهر في المتجر»." : "عدّل البيانات والأسعار والصور. ارفع الصور بالنقر أو بالسحب والإفلات."}
      />
      <ProductEditor initial={product} isNew={isNew} base={base} defaults={defaults} />
    </>
  );
}
