import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShopAdmin, adminBase } from "@/lib/shop/admin";
import { getStoreFresh } from "@/lib/shop/store";
import { defaultStore } from "@/lib/shop/defaults";
import type { Product } from "@/lib/shop/schema";
import { PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/shop-admin/ProductEditor";

export const metadata = { title: "Produkt bearbeiten" };

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
  colors: [{ id: "schwarz", name: { de: "Schwarz", ar: "أسود" }, hex: "#1d1d1f", image: "", detail: "" }],
  image: "",
  detail: "",
  gallery: [],
  variants: ["S", "M", "L", "XL", "XXL"].map((s) => ({ id: s, label: { de: s, ar: s }, priceCents: 2990, image: "", active: true })),
  sizeChart: [],
  maxQty: 50,
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
        eyebrow={<Link href={`${base}/produkte`} className="hover:text-ink">← Produkte</Link>}
        title={isNew ? "Neues Produkt" : product.name.de || "Produkt"}
        description={isNew ? "Neues Produkt anlegen – erst nach „Im Shop sichtbar“ erscheint es im Shop." : "Alle Angaben auf Deutsch und Arabisch. Bilder per Klick oder Drag & Drop hochladen."}
      />
      <ProductEditor initial={product} isNew={isNew} base={base} defaults={defaults} />
    </>
  );
}
