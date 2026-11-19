import { NextResponse } from "next/server";
import { z } from "zod";
import { isLang, SHOP_HOSTS, SHOP_URL } from "@/lib/shop/config";
import { resolveLine } from "@/lib/shop/schema";
import { getStore } from "@/lib/shop/store";
import { priceCart } from "@/lib/shop/pricing";
import { createCheckoutSession, createCoupon, isStripeConfigured } from "@/lib/shop/stripe";
import { clientIpHash, rateLimit } from "@/lib/security";

const schema = z.object({
  lang: z.string(),
  items: z
    .array(z.object({ slug: z.string().max(80), color: z.string().max(40), size: z.string().max(30), qty: z.number().int().min(1).max(1000) }))
    .min(1)
    .max(40),
});

/** Rückkehr-Adresse: Shop-Subdomain in Produktion, sonst aktuelle Vorschau-Domain + /shop */
function origin(request: Request) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").toLowerCase();
  const bare = host.split(":")[0];
  if (bare === "shop.quickdesign24.de") return SHOP_URL;
  const proto = request.headers.get("x-forwarded-proto") ?? (bare.endsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${SHOP_HOSTS.includes(bare) ? "" : "/shop"}`;
}

/** Stripe-Checkout erstellen – Preise und Angebote ausschließlich aus dem Shop-Stand des Servers */
export async function POST(request: Request) {
  if (!isStripeConfigured()) return NextResponse.json({ error: "disabled" }, { status: 503 });
  const ip = await clientIpHash();
  if (!(await rateLimit(`checkout:${ip}`, 20, 600))) return NextResponse.json({ error: "rate" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const lang = isLang(parsed.data.lang) ? parsed.data.lang : "de";
  const store = await getStore();
  const resolved = parsed.data.items.map((l) => resolveLine(store, l));
  if (resolved.some((l) => !l)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const price = priceCart(store, resolved.filter((l): l is NonNullable<typeof l> => !!l));
  const items = price.lines;
  const sh = store.settings.shipping;
  const base = origin(request);
  const variantName = (l: (typeof items)[number]) => [l.color?.name.de, l.variant.label.de].filter(Boolean).join(" – ");
  const days = (d: string) => {
    const [a, b] = d.split(/[–-]/).map((x) => parseInt(x, 10));
    return Number.isFinite(a) ? { minimum: { unit: "business_day", value: a }, maximum: { unit: "business_day", value: Number.isFinite(b) ? b : a } } : undefined;
  };

  try {
    // Paket- und Vorbestellrabatte als einmaliger Gutschein (Stückpreis-Rabatte stecken bereits im Preis)
    const coupon = price.cartDiscountCents
      ? await createCoupon({
          amount_off: price.cartDiscountCents,
          currency: "eur",
          duration: "once",
          max_redemptions: 1,
          name: price.discounts.map((d) => d.label.de).join(" + ").slice(0, 40),
        })
      : null;

    const standard = price.shipping.find((x) => x.id === "standard")!;
    const session = await createCheckoutSession({
      mode: "payment",
      discounts: coupon ? [{ coupon: coupon.id }] : undefined,
      // Zahlarten (Karte, Apple Pay, Google Pay, PayPal, Klarna …) kommen aus dem Stripe-Dashboard
      line_items: items.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: "eur",
          unit_amount: l.unitCents,
          product_data: {
            name: `${l.product.name.de} – ${variantName(l)}`,
            description: l.unitPct ? `${l.product.tagline.de || l.product.name.de} · ${l.unitOffer?.de ?? "Rabatt"} (−${l.unitPct} %)` : l.product.tagline.de || undefined,
            metadata: { slug: l.product.id, color: l.color?.id ?? "", size: l.variant.id },
          },
        },
      })),
      shipping_address_collection: { allowed_countries: ["DE"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: standard.cents ? `Standardversand (${sh.deliveryDays} Werktage)` : `Standardversand – kostenlos (${sh.deliveryDays} Werktage)`,
            fixed_amount: { amount: standard.cents, currency: "eur" },
            delivery_estimate: days(sh.deliveryDays),
          },
        },
        ...(sh.express.enabled
          ? [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  display_name: `Express – bevorzugte Produktion (${sh.express.days} Werktage)`,
                  fixed_amount: { amount: sh.express.cents, currency: "eur" },
                  delivery_estimate: days(sh.express.days),
                },
              },
            ]
          : []),
        ...(sh.pickup.enabled
          ? [{ shipping_rate_data: { type: "fixed_amount", display_name: "Kostenlose Abholung – QuickDesign, Saarbrücken", fixed_amount: { amount: 0, currency: "eur" } } }]
          : []),
      ],
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      locale: lang === "de" ? "de" : "auto",
      custom_text: {
        submit: { message: "Mit Ihrer Bestellung akzeptieren Sie unsere AGB und die Widerrufsbelehrung (shop.quickdesign24.de/de/agb)." },
        shipping_address: { message: "Versand nur innerhalb Deutschlands. Bei Abholung in Saarbrücken bitte trotzdem Ihre Anschrift angeben." },
      },
      metadata: {
        lang,
        items: items.map((l) => `${l.qty}x ${l.product.id}/${l.color?.id ?? "-"}/${l.variant.id}`).join("; ").slice(0, 490),
        discounts: price.discounts.map((d) => `${d.id}:${d.cents}`).join(";").slice(0, 490),
      },
      success_url: `${base}/${lang}/danke?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/${lang}`,
    });
    if (!session.url) throw new Error("Keine Checkout-URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[shop-checkout]", error);
    return NextResponse.json({ error: "stripe" }, { status: 502 });
  }
}
