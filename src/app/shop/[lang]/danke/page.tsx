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
import { Artwork } from "@/components/shop/Artwork";

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
    <section className="relative overflow-hidden">
      <ClearCart />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,122,61,0.25),transparent_60%)]" />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
        <div className="w-44">
          <Artwork art="seal" tone="light" className="[&_svg]:h-auto [&_svg]:w-full" />
        </div>
        {paid ? <CheckCircle2 className="mt-8 size-10 text-emerald-400" aria-hidden /> : null}
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t.danke.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-white/75">{t.danke.text}</p>
        {session?.amount_total ? (
          <p className="mt-4 text-white/60">
            <span className="ltr-num font-semibold text-[var(--shop-gold-2)]">{money(session.amount_total)}</span>
            {session.customer_details?.email ? <span className="ltr-num"> · {session.customer_details.email}</span> : null}
          </p>
        ) : null}
        <p className="mt-6 rounded-2xl bg-white/[0.05] px-5 py-4 text-sm text-white/70 ring-1 ring-white/10">{t.danke.pickup}</p>
        <Link href={`${base}/${lang}`} className="mt-10 inline-flex rounded-full bg-white px-7 py-3.5 font-semibold text-[#0a0c0b] hover:bg-[var(--shop-gold-2)]">
          {t.danke.back}
        </Link>
      </div>
    </section>
  );
}
