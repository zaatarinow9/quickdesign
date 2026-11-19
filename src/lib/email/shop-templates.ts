/** E-Mails zum Shop: neue Bestellung (intern) und Bestellbestätigung (Kunde, DE/AR) */
import { escapeHtml, layout, PAPER, STONE, summaryTable, type Company, type EmailContent } from "./templates";

export type ShopOrderMail = {
  number: string;
  lang: "de" | "ar";
  name: string;
  email: string;
  phone: string;
  pickup: boolean;
  shippingMethod: string;
  address: string;
  items: { description: string; quantity: number; amount: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  test: boolean;
};

const eur = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

function itemsTable(o: ShopOrderMail, rtl = false) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:9px 14px;border-bottom:1px solid #e6e2da;font-size:14px;">${i.quantity}× ${escapeHtml(i.description)}</td><td align="${rtl ? "left" : "right"}" style="padding:9px 14px;border-bottom:1px solid #e6e2da;font-size:14px;white-space:nowrap;direction:ltr;">${eur(i.amount)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e6e2da;border-radius:10px;">${rows}</table>`;
}

export function shopOrderAdminEmail(opts: { siteUrl: string; company: Company; order: ShopOrderMail; adminUrl: string }): EmailContent {
  const o = opts.order;
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `Neue Shop-Bestellung ${o.number} – ${eur(o.total)}`,
    body: `${o.test ? `<p style="margin:0 0 12px;padding:8px 12px;background:#fff4d6;border-radius:8px;font-size:13px;"><strong>TESTMODUS</strong> – keine echte Zahlung.</p>` : ""}
<p style="margin:0 0 4px;font-size:13px;color:${STONE};">Neue Bestellung im Shop · Kollektion 8.12.</p>
<p style="margin:0 0 14px;font-family:Outfit,Inter,Arial,sans-serif;font-size:22px;font-weight:700;">${escapeHtml(o.number)} · ${eur(o.total)}</p>
${itemsTable(o)}
${summaryTable([
  { label: "Zwischensumme", value: eur(o.subtotal) },
  { label: "Versand", value: `${eur(o.shipping)} (${o.shippingMethod})` },
  ...(o.subtotal + o.shipping - o.total > 0 ? [{ label: "Rabatt (Angebot 2 + 1)", value: `−${eur(o.subtotal + o.shipping - o.total)}` }] : []),
  { label: "Gesamt (bezahlt)", value: eur(o.total), strong: true },
])}
<div style="padding:14px 16px;background:${PAPER};border-radius:10px;font-size:14px;line-height:1.6;">
<strong>${o.pickup ? "🏪 Abholung in Saarbrücken" : "📦 Versand an"}</strong><br>
${escapeHtml(o.name)}<br>${escapeHtml(o.address).replace(/\n/g, "<br>")}<br>
📞 ${escapeHtml(o.phone || "–")} · ✉️ ${escapeHtml(o.email)}<br>
Sprache: ${o.lang === "ar" ? "Arabisch" : "Deutsch"}
</div>
<p style="margin:18px 0 0;"><a href="${opts.adminUrl}" style="color:#df1986;font-weight:600;">Bestellungen in der Verwaltung öffnen →</a></p>`,
  });
  const text = [
    `${o.test ? "[TEST] " : ""}Neue Shop-Bestellung ${o.number} – ${eur(o.total)}`,
    "",
    ...o.items.map((i) => `${i.quantity}x ${i.description} – ${eur(i.amount)}`),
    `Versand: ${o.shippingMethod} ${eur(o.shipping)}`,
    "",
    o.name,
    o.address,
    `Tel: ${o.phone}`,
    `E-Mail: ${o.email}`,
    opts.adminUrl,
  ].join("\n");
  return { subject: `${o.test ? "[TEST] " : ""}🛍 Neue Shop-Bestellung ${o.number} – ${eur(o.total)}`, html, text };
}

export function shopOrderCustomerEmail(opts: { siteUrl: string; company: Company; order: ShopOrderMail; shopUrl: string }): EmailContent {
  const o = opts.order;
  const ar = o.lang === "ar";
  const t = ar
    ? {
        hi: `مرحباً ${o.name}،`,
        intro: "شكراً جزيلاً على طلبك من مجموعة ٨ كانون الأول! وصلنا الدفع وسنبدأ بطباعة قطعك بكل عناية.",
        pickup: "سنبلغك فور جهوز طلبك للاستلام في المحل في زاربروكن.",
        ship: "سنرسل لك رسالة فور شحن طلبك.",
        order: "رقم الطلب",
        total: "المجموع",
        shipping: "الشحن",
        bye: "مع التحية،<br><strong>فريق QuickDesign</strong>",
        subject: `تأكيد طلبك ${o.number} – QuickDesign`,
      }
    : {
        hi: `Hallo ${o.name},`,
        intro: "vielen Dank für Ihre Bestellung aus der Kollektion 8.12.! Ihre Zahlung ist eingegangen – wir drucken Ihre Teile jetzt mit Sorgfalt.",
        pickup: "Wir melden uns, sobald Ihre Bestellung in unserem Laden in Saarbrücken zur Abholung bereitliegt.",
        ship: "Wir benachrichtigen Sie, sobald Ihre Bestellung unterwegs ist.",
        order: "Bestellnummer",
        total: "Gesamt",
        shipping: "Versand",
        bye: "Mit freundlichen Grüßen<br><strong>Ihr QuickDesign-Team</strong>",
        subject: `Ihre Bestellung ${o.number} bei QuickDesign`,
      };
  const body = `<div dir="${ar ? "rtl" : "ltr"}" style="text-align:${ar ? "right" : "left"};">
<p style="margin:0 0 14px;">${escapeHtml(t.hi)}</p>
<p style="margin:0 0 6px;">${t.intro}</p>
${itemsTable(o, ar)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:${PAPER};border-radius:12px;font-size:14px;">
<tr><td style="padding:9px 16px;color:${STONE};">${t.order}</td><td align="${ar ? "left" : "right"}" style="padding:9px 16px;font-weight:600;direction:ltr;">${escapeHtml(o.number)}</td></tr>
<tr><td style="padding:9px 16px;color:${STONE};">${t.shipping}</td><td align="${ar ? "left" : "right"}" style="padding:9px 16px;direction:ltr;">${eur(o.shipping)}</td></tr>
<tr><td style="padding:9px 16px;color:${STONE};">${t.total}</td><td align="${ar ? "left" : "right"}" style="padding:9px 16px;font-weight:700;font-size:17px;direction:ltr;">${eur(o.total)}</td></tr>
</table>
<p style="margin:0 0 6px;">${o.pickup ? t.pickup : t.ship}</p>
<p style="margin:22px 0 0;">${t.bye}</p></div>`;
  const html = layout({ siteUrl: opts.siteUrl, company: opts.company, preheader: t.subject, body });
  const text = [t.hi, "", t.intro.replace(/<[^>]+>/g, ""), "", ...o.items.map((i) => `${i.quantity}x ${i.description} – ${eur(i.amount)}`), `${t.order}: ${o.number}`, `${t.total}: ${eur(o.total)}`, "", o.pickup ? t.pickup : t.ship].join("\n");
  return { subject: t.subject, html, text };
}
