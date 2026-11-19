"use client";

import { useState } from "react";
import { categoryKinds, type CategorySlug, type Product, type ShopStore } from "@/lib/shop/schema";
import type { Lang } from "@/lib/shop/config";
import type { ShopDict } from "@/lib/shop/i18n";
import { ProductCard } from "./ProductCard";
import { categoryIcon } from "./ShopIcons";
import { cn } from "@/lib/utils";

/** Produkte mit Bereichs-Reitern (wechselt ohne Neuladen, sanft animiert) */
export function CollectionTabs({
  products,
  store,
  sections,
  lang,
  t,
  base,
  now,
}: {
  products: Product[];
  store: ShopStore;
  sections: { slug: CategorySlug; title: string }[];
  lang: Lang;
  t: ShopDict;
  base: string;
  now: number;
}) {
  const [tab, setTab] = useState<CategorySlug | "all">("all");
  const list = tab === "all" ? products : products.filter((p) => categoryKinds[tab].includes(p.kind));
  const tabs = [{ slug: "all" as const, title: lang === "ar" ? "الكل" : "Alle" }, ...sections];

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
        {tabs.map((x) => {
          const Icon = x.slug === "all" ? null : categoryIcon[x.slug];
          const active = tab === x.slug;
          return (
            <button
              key={x.slug}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(x.slug)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-[0.95rem] transition-all duration-300",
                active ? "border-[var(--green)] bg-[var(--green)] text-white shadow-[0_10px_24px_-14px_rgba(5,66,57,0.8)]" : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--green)]",
              )}
            >
              {Icon ? <Icon className={cn("size-5", active ? "text-[var(--gold)]" : "text-[var(--gold)]")} /> : null}
              {x.title}
            </button>
          );
        })}
      </div>
      <div key={tab} className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
        {list.map((p, i) => (
          <div key={p.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
            <ProductCard p={p} store={store} lang={lang} t={t} href={`${base}/${lang}/produkt/${p.id}`} now={now} priority={i < 4} />
          </div>
        ))}
      </div>
    </>
  );
}
