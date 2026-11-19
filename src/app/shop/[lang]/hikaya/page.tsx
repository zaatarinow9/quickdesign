import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLang } from "@/lib/shop/config";
import { shopBase } from "@/lib/shop/server";
import { getStore } from "@/lib/shop/store";
import { Reveal } from "@/components/shop/Reveal";
import { WavingFlag } from "@/components/brand/WavingFlag";

export const metadata: Metadata = { title: "يومٌ لن ننساه", alternates: { canonical: "/ar/hikaya" } };

export default async function StoryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [store, base] = await Promise.all([getStore(), shopBase()]);
  const s = store.settings.story;
  const ar = lang === "ar";
  const cover = s.image || s.images[0]?.url;

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--green)] text-white">
        {cover ? <Image src={cover} alt="" fill priority sizes="100vw" className="ken object-cover opacity-30" /> : null}
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="ltr-num inline-flex items-center gap-2 text-sm text-[var(--mint)]">
            <WavingFlag className="h-4 w-auto" amp={4} dur={3} />
            {s.eyebrow[lang] || s.eyebrow.de}
          </p>
          <h1 className="rise mt-5 text-5xl leading-tight sm:text-7xl">{s.title[lang] || s.title.de}</h1>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="space-y-6 text-lg leading-loose text-[#2b2f2e]">
          {s.paragraphs.map((p, i) => (
            <Reveal key={i} delay={i * 80}>
              <p>{p[lang] || p.de}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <blockquote className="my-14 border-s-4 border-[var(--gold)] bg-[var(--paper-2)] px-6 py-8 text-2xl leading-snug text-[var(--green)] sm:text-3xl">{s.quote[lang] || s.quote.de}</blockquote>
        </Reveal>
      </article>

      {s.images.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid auto-rows-[220px] grid-cols-2 gap-3 sm:auto-rows-[260px] lg:grid-cols-4">
            {s.images.map((im, i) => (
              <Reveal key={im.url} as="figure" delay={i * 80} className={`group relative overflow-hidden rounded-2xl bg-[var(--paper-2)] ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                <Image src={im.url} alt={im.caption[lang] || ""} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition duration-[1.4s] ease-out group-hover:scale-105" />
                {im.caption[lang] || im.credit ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-sm text-white">
                    {im.caption[lang]}
                    {im.credit ? <span className="mt-1 block text-[0.68rem] text-white/60">{im.credit}</span> : null}
                  </figcaption>
                ) : null}
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      <div className="pb-20 text-center">
        <Link href={`${base}/${lang}`} className="inline-flex h-12 items-center rounded-full bg-[var(--green)] px-7 font-medium text-white transition-colors hover:bg-[var(--green-2)]">
          {ar ? "تسوّق مجموعة الذكرى" : "Zur Kollektion"}
        </Link>
      </div>
    </>
  );
}
