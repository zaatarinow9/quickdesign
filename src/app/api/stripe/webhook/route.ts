import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings/server";
import { mailCompany } from "@/lib/admin/company";
import { sendMail } from "@/lib/email/send";
import { shopOrderAdminEmail, shopOrderCustomerEmail, type ShopOrderMail } from "@/lib/email/shop-templates";
import { getCheckoutSession, verifyWebhook, type CheckoutSession } from "@/lib/shop/stripe";
import { SHOP_URL } from "@/lib/shop/config";

export const runtime = "nodejs";

const fmtAddress = (a?: Record<string, string | null> | null) =>
  a ? [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.country].filter(Boolean).join("\n") : "";

/**
 * Stripe-Webhook: https://shop.quickdesign24.de/api/stripe/webhook
 * Ereignisse: checkout.session.completed, checkout.session.async_payment_succeeded
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const payload = await request.text();
  if (!secret || !verifyWebhook(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; livemode: boolean; data: { object: CheckoutSession } };
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true });
  }
  const basic = event.data.object;
  if (basic.payment_status !== "paid") return NextResponse.json({ received: true, pending: true });

  const session = (await getCheckoutSession(basic.id).catch(() => null)) ?? basic;
  const ship = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const rate = session.shipping_cost?.shipping_rate;
  const shippingMethod = typeof rate === "object" && rate?.display_name ? rate.display_name : (session.shipping_cost?.amount_total ? "Versand" : "Abholung / kostenloser Versand");
  const pickup = /abholung|استلام/i.test(shippingMethod);
  const lang = session.metadata?.lang === "ar" ? "ar" : "de";
  const items = (session.line_items?.data ?? []).map((l) => ({ description: l.description, quantity: l.quantity, amount: l.amount_total }));

  // Jede Session nur einmal verarbeiten (Stripe kann Ereignisse wiederholen)
  const { data: inserted, error } = await db()
    .from("shop_orders")
    .insert({
      stripe_session_id: session.id,
      lang,
      email: session.customer_details?.email ?? null,
      name: ship?.name ?? session.customer_details?.name ?? null,
      phone: session.customer_details?.phone ?? null,
      shipping_method: shippingMethod,
      shipping_address: ship?.address ?? {},
      items,
      amount_subtotal: session.amount_subtotal ?? 0,
      amount_shipping: session.shipping_cost?.amount_total ?? 0,
      amount_total: session.amount_total ?? 0,
      livemode: !!event.livemode,
    })
    .select("id, number")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    console.error("[stripe-webhook] db", error.message);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const order: ShopOrderMail = {
    number: inserted?.number ?? session.id.slice(-8),
    lang,
    name: ship?.name ?? session.customer_details?.name ?? "",
    email: session.customer_details?.email ?? "",
    phone: session.customer_details?.phone ?? "",
    pickup,
    shippingMethod,
    address: fmtAddress(ship?.address),
    items,
    subtotal: session.amount_subtotal ?? 0,
    shipping: session.shipping_cost?.amount_total ?? 0,
    total: session.amount_total ?? 0,
    test: !event.livemode,
  };
  const s = await getSettings();
  const company = mailCompany(s);
  await sendMail(s.notifications.inbox || "info@quickdesign24.de", shopOrderAdminEmail({ siteUrl: env.siteUrl, company, order, adminUrl: `${env.siteUrl}/admin/shop` }), {
    kind: "shop-bestellung",
    relatedId: inserted?.id ?? null,
    replyTo: order.email || null,
  });
  if (order.email) {
    await sendMail(order.email, shopOrderCustomerEmail({ siteUrl: env.siteUrl, company, order, shopUrl: SHOP_URL }), { kind: "shop-bestaetigung", relatedId: inserted?.id ?? null, replyTo: s.notifications.inbox || null });
  }
  return NextResponse.json({ received: true });
}
