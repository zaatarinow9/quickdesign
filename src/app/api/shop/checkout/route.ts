import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveLine } from "@/lib/shop/catalog";
import { isLang, shipping, SHOP_HOSTS, SHOP_URL, shopLimits } from "@/lib/shop/config";
import { createCheckoutSession, isStripeConfigured } from "@/lib/shop/stripe";
import { clientIpHash, rateLimit } from "@/lib/security";

const schema = z.object({
  lang: z.string(),
  items: z
    .array(z.object({ slug: z.string().max(80), color: z.string().max(40), size: z.string().max(10), qty: z.number().int().min(1).max(shopLimits.maxQtyPerLine) }))
    .min(1)
    .max(shopLimits.maxLines),
});

/** Rückkehr-Adresse: Shop-Subdomain in Produktion, sonst aktuelle Vorschau-Domain + /shop */
function origin(request: Request) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").toLowerCase();
  const bare = host.split(":")[0];
  if (bare === "shop.quickdesign24.de") return SHOP_URL;
  const proto = request.headers.get("x-forwarded-proto") ?? (bare.endsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${SHOP_HOSTS.includes(bare) ? "" : "/shop"}`;
}

/** Stripe-Checkout erstellen – Preise ausschließlich aus dem Katalog */
export async function POST(request: Request) {
  if (!isStripeConfigured()) return NextResponse.json({ error: "disabled" }, { status: 503 });
  const ip = await clientIpHash();
  if (!(await rateLimit(`checkout:${ip}`, 20, 600))) return NextResponse.json({ error: "rate" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const lang = isLang(parsed.data.lang) ? parsed.data.lang : "de";
  const lines = parsed.data.items.map(resolveLine);
  if (lines.some((l) => !l)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const items = lines.filter((l): l is NonNullable<typeof l> => !!l);
  const subtotal = items.reduce((s, l) => s + l.unitCents * l.qty, 0);
  const shippingCents = subtotal >= shipping.freeFromCents ? 0 : shipping.standardCents;
  const base = origin(request);

  try {
    const session = await createCheckoutSession({
      mode: "payment",
      // Zahlarten (Karte, Apple Pay, Google Pay, PayPal, Klarna …) kommen aus dem Stripe-Dashboard
      line_items: items.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: "eur",
          unit_amount: l.unitCents,
          product_data: {
            name: `${l.product.name.de} – ${l.color.name.de} – ${l.size}`,
            description: l.product.tagline.de,
            metadata: { slug: l.product.slug, color: l.color.id, size: l.size },
          },
        },
      })),
      shipping_address_collection: { allowed_countries: [...shipping.countries] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: shippingCents ? "Versand innerhalb Deutschlands" : "Versand innerhalb Deutschlands (kostenlos ab 60 €)",
            fixed_amount: { amount: shippingCents, currency: "eur" },
            delivery_estimate: { minimum: { unit: "business_day", value: 3 }, maximum: { unit: "business_day", value: 5 } },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Kostenlose Abholung – QuickDesign, Saarbrücken",
            fixed_amount: { amount: 0, currency: "eur" },
          },
        },
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
        items: items.map((l) => `${l.qty}x ${l.product.slug}/${l.color.id}/${l.size}`).join("; ").slice(0, 490),
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
