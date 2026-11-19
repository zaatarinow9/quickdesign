import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { isLang } from "@/lib/shop/config";
import { dict } from "@/lib/shop/i18n";
import { shopBase } from "@/lib/shop/server";
import { getCheckoutSession } from "@/lib/shop/stripe";
import { money } from "@/lib/shop/format";
import { ClearCart } from "@/components/shop/ClearCart";

export const metadata: Metadata = { robots: { index: false } };

export default async function DankePage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict[lang];
  const base = await shopBase();
  const { session_id } = await searchParams;
  const session = session_id ? await getCheckoutSession(session_id).catch(() => null) : null;
  const paid = !session_id || session?.payment_status === "paid" || session?.status === "complete";

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:py-32">
      <ClearCart />
      {paid ? (
        <span className="grid size-14 place-items-center rounded-full bg-[var(--green)] text-white">
          <CheckCircle2 className="size-7" strokeWidth={1.6} aria-hidden />
        </span>
      ) : null}
      <h1 className="mt-8 text-3xl text-balance sm:text-4xl">{t.danke.title}</h1>
      <p className="mt-5 leading-relaxed text-[#3d3a35]">{t.danke.text}</p>
      {session?.amount_total ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          <span className="ltr-num text-[var(--ink)]">{money(session.amount_total)}</span>
          {session.customer_details?.email ? <span className="ltr-num"> · {session.customer_details.email}</span> : null}
        </p>
      ) : null}
      <p className="mt-8 rounded-xl px-5 py-4 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">{t.danke.pickup}</p>
      <Link href={`${base}/${lang}`} className="mt-10 inline-flex h-12 items-center rounded-full bg-[var(--ink)] px-6 font-medium text-white hover:bg-black">
        {t.danke.back}
      </Link>
      <div className="shop-tricolor mt-16 h-1 w-24 rounded-full ring-1 ring-[var(--line)]" aria-hidden />
    </section>
  );
}
