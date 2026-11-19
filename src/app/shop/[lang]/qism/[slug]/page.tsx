import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLang } from "@/lib/shop/config";
import { dict } from "@/lib/shop/i18n";
import { shopBase } from "@/lib/shop/server";
import { getStore } from "@/lib/shop/store";
import { activeProducts, categoryKinds, categorySlugs, type CategorySlug } from "@/lib/shop/schema";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/shop/Reveal";
import { categoryIcon } from "@/components/shop/ShopIcons";

const nowMs = () => Date.now();
const isSlug = (s: string): s is CategorySlug => (categorySlugs as readonly string[]).includes(s);

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang) || !isSlug(slug)) return {};
  const sec = (await getStore()).settings.sections.find((x) => x.slug === slug);
  return { title: sec?.title[lang] || slug, alternates: { canonical: `/ar/qism/${slug}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  if (!isLang(lang) || !isSlug(slug)) notFound();
  const [store, base] = await Promise.all([getStore(), shopBase()]);
  const t = dict[lang];
  const ar = lang === "ar";
  const href = (p = "") => `${base}/${lang}${p}`;
  const sec = store.settings.sections.find((x) => x.slug === slug);
  const list = activeProducts(store).filter((p) => categoryKinds[slug].includes(p.kind));
  const now = nowMs();
  const others = store.settings.sections.filter((x) => x.slug !== slug);

  return (
    <>
      <section className="relative h-[200px] overflow-hidden bg-[var(--green)] sm:h-[260px]">
        {sec?.image ? <Image src={sec.image} alt="" fill priority sizes="100vw" className="ken object-cover" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,66,57,0.35),rgba(5,30,26,0.7))]" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-8 text-white sm:px-6">
          <nav className="text-sm text-white/70">
            <Link href={href()} className="hover:text-white">{ar ? "الرئيسية" : "Start"}</Link> <span aria-hidden>/</span> {sec?.title[lang]}
          </nav>
          <h1 className="mt-2 text-4xl sm:text-5xl">{sec?.title[lang] || slug}</h1>
          {sec?.text[lang] ? <p className="mt-2 text-white/80">{sec.text[lang]}</p> : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm text-[var(--muted)]">{ar ? `${list.length} منتجات` : `${list.length} Produkte`}</p>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {list.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 70}>
              <ProductCard p={p} store={store} lang={lang} t={t} href={href(`/produkt/${p.id}`)} now={now} priority={i < 4} />
            </Reveal>
          ))}
        </div>
        {!list.length ? <p className="py-16 text-center text-[var(--muted)]">{ar ? "لا توجد منتجات في هذا القسم حالياً." : "Noch keine Produkte."}</p> : null}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="text-xl">{ar ? "أقسام أخرى" : "Weitere Bereiche"}</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {others.map((x) => {
            const Icon = categoryIcon[x.slug];
            return (
              <Link key={x.slug} href={href(`/qism/${x.slug}`)} className="group flex flex-col items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-3 py-5 text-center text-sm transition hover:border-[var(--green)]">
                <Icon className="size-8 text-[var(--gold)] group-hover:text-[var(--green)]" />
                {x.title[lang]}
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
