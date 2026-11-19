import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Schlanke Stripe-Anbindung über die REST-API (kein SDK nötig).
 * Schlüssel nur aus Umgebungsvariablen: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 */
const key = () => process.env.STRIPE_SECRET_KEY?.trim() ?? "";
export const isStripeConfigured = () => /^(sk|rk)_(test|live)_/.test(key());
export const isStripeTestMode = () => key().startsWith("sk_test_") || key().startsWith("rk_test_");

type Params = Record<string, unknown>;

/** Objekt → application/x-www-form-urlencoded im Stripe-Format (a[b][0][c]=…) */
function encode(obj: Params, prefix = "", out: string[] = []): string[] {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" && item !== null ? encode(item as Params, `${name}[${i}]`, out) : out.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`)));
    else if (typeof v === "object") encode(v as Params, name, out);
    else out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

async function stripe<T>(method: "GET" | "POST", path: string, params?: Params): Promise<T> {
  const body = params ? encode(params).join("&") : undefined;
  const url = method === "GET" && body ? `https://api.stripe.com/v1${path}?${body}` : `https://api.stripe.com/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `Stripe ${res.status}`);
  return data;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  status: string | null;
  payment_status: string;
  amount_total: number | null;
  amount_subtotal: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null; address?: Record<string, string | null> | null } | null;
  shipping_details?: { name?: string | null; address?: Record<string, string | null> | null } | null;
  collected_information?: { shipping_details?: { name?: string | null; address?: Record<string, string | null> | null } | null } | null;
  shipping_cost?: { amount_total: number; shipping_rate?: string | { display_name?: string } | null } | null;
  line_items?: { data: { description: string; quantity: number; amount_total: number }[] };
};

export const createCheckoutSession = (params: Params) => stripe<CheckoutSession>("POST", "/checkout/sessions", params);

export const getCheckoutSession = (id: string) => {
  if (!isStripeConfigured() || !/^cs_[A-Za-z0-9_]+$/.test(id)) return Promise.resolve(null);
  return stripe<CheckoutSession>("GET", `/checkout/sessions/${id}`, { expand: ["line_items", "shipping_cost.shipping_rate"] });
};

/** Prüft die Webhook-Signatur (Stripe-Signature: t=…,v1=…) mit 5 Minuten Toleranz */
export function verifyWebhook(payload: string, header: string | null, secret: string, toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").flatMap((kv) => {
      const [k, v] = kv.split("=");
      return k && v ? [[k.trim(), v.trim()]] : [];
    }),
  ) as Record<string, string>;
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const signatures = header
    .split(",")
    .filter((kv) => kv.trim().startsWith("v1="))
    .map((kv) => kv.trim().slice(3));
  return signatures.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}
