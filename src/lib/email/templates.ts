/**
 * E-Mail-Vorlagen im QuickDesign-Look (Tabellen-Layout, Inline-Styles – funktioniert in allen Clients).
 */
import type { SmtpAttachment } from "@/lib/email/smtp";

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
  attachments?: SmtpAttachment[];
  headers?: Record<string, string>;
};

const INK = "#0b0b0c";
const PAPER = "#f4f2ed";
const ACCENT = "#df1986";
const CYAN = "#2fa7df";
const STONE = "#5e5b55";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const nl2br = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>");

type Company = { name: string; street: string; postalCode: string; city: string; phone: string; email: string; website: string };

function layout(opts: { siteUrl: string; company: Company; preheader: string; body: string; footerExtra?: string }) {
  const { siteUrl, company } = opts;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(company.name)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:${INK};">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
    <tr><td style="background:${INK};padding:26px 32px;">
      <img src="${siteUrl}/logo.png" width="150" alt="${escapeHtml(company.name)}" style="display:block;width:150px;height:auto;filter:invert(1);">
    </td></tr>
    <tr><td style="height:4px;background:linear-gradient(90deg,${ACCENT},${CYAN});background-color:${ACCENT};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:34px 32px 10px;font-size:15px;line-height:1.65;color:${INK};">${opts.body}</td></tr>
    <tr><td style="padding:22px 32px 30px;font-size:12px;line-height:1.6;color:${STONE};border-top:1px solid #ebe8e1;">
      <strong style="color:${INK}">${escapeHtml(company.name)}</strong><br>
      ${escapeHtml(company.street)} · ${escapeHtml(company.postalCode)} ${escapeHtml(company.city)}<br>
      ${escapeHtml(company.phone)} · <a href="mailto:${escapeHtml(company.email)}" style="color:${STONE}">${escapeHtml(company.email)}</a> · <a href="${siteUrl}" style="color:${STONE}">${escapeHtml(company.website)}</a>
      ${opts.footerExtra ?? ""}
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px;"><tr><td style="border-radius:999px;background:${ACCENT};">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-weight:600;font-size:15px;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function summaryTable(rows: { label: string; value: string; strong?: boolean }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:${PAPER};border-radius:12px;">
${rows
  .map(
    (r) => `<tr><td style="padding:10px 16px;font-size:14px;color:${STONE};">${escapeHtml(r.label)}</td><td align="right" style="padding:10px 16px;font-size:${r.strong ? 17 : 14}px;font-weight:${r.strong ? 700 : 600};color:${r.strong ? ACCENT : INK};">${escapeHtml(r.value)}</td></tr>`,
  )
  .join("")}
</table>`;
}

/* --------------------------------------------------------------------- */

export function documentEmail(opts: {
  siteUrl: string;
  company: Company;
  kind: "angebot" | "rechnung";
  greeting: string;
  message: string | null;
  number: string;
  title: string;
  date: string;
  validUntil?: string | null;
  dueDate?: string | null;
  gross: string;
  onlineUrl: string;
  signature: string;
  attachment: SmtpAttachment;
}): EmailContent {
  const isOffer = opts.kind === "angebot";
  const label = isOffer ? "Angebot" : "Rechnung";
  const defaultMessage = isOffer
    ? "anbei erhalten Sie unser Angebot. Sie können es bequem online ansehen und mit einem Klick annehmen – das PDF finden Sie zusätzlich im Anhang."
    : "anbei erhalten Sie unsere Rechnung als PDF. Sie können sie auch jederzeit online ansehen und herunterladen.";
  const message = opts.message?.trim() || defaultMessage;
  const rows = [
    { label: `${label}snummer`, value: opts.number },
    { label: "Datum", value: opts.date },
    ...(opts.validUntil ? [{ label: "Gültig bis", value: opts.validUntil }] : []),
    ...(opts.dueDate ? [{ label: "Fällig am", value: opts.dueDate }] : []),
    { label: "Gesamtbetrag", value: opts.gross, strong: true },
  ];

  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `${label} ${opts.number} – ${opts.gross}`,
    body: `<p style="margin:0 0 16px;">${escapeHtml(opts.greeting)}</p>
<p style="margin:0 0 6px;">${nl2br(message)}</p>
<p style="margin:22px 0 0;font-family:Outfit,Inter,Arial,sans-serif;font-size:20px;font-weight:600;">${escapeHtml(opts.title)}</p>
${summaryTable(rows)}
${button(opts.onlineUrl, isOffer ? "Angebot online ansehen & annehmen" : "Rechnung online ansehen")}
<p style="margin:26px 0 0;">Mit freundlichen Grüßen<br><strong>${escapeHtml(opts.signature)}</strong><br>${escapeHtml(opts.company.name)}</p>`,
  });

  const text = [
    opts.greeting,
    "",
    message,
    "",
    opts.title,
    ...rows.map((r) => `${r.label}: ${r.value}`),
    "",
    `Online ansehen: ${opts.onlineUrl}`,
    "",
    "Mit freundlichen Grüßen",
    opts.signature,
    opts.company.name,
  ].join("\n");

  return { subject: `${label} ${opts.number} – ${opts.title}`.slice(0, 190), html, text, attachments: [opts.attachment] };
}

export function inquiryNotificationEmail(opts: {
  siteUrl: string;
  company: Company;
  reference: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  interests: string[];
  message: string;
  marketing: boolean;
  adminUrl: string;
}): EmailContent {
  const rows = [
    ["Name", opts.name],
    ["Firma", opts.companyName],
    ["E-Mail", opts.email],
    ["Telefon", opts.phone],
    ["Interesse", opts.interests.join(", ") || null],
    ["Werbe-Einwilligung", opts.marketing ? "angefragt (Double-Opt-in läuft)" : "nein"],
  ].filter((r): r is [string, string] => !!r[1]);
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `Neue Anfrage ${opts.reference} von ${opts.name}`,
    body: `<p style="margin:0 0 4px;font-size:13px;color:${STONE};">Neue Anfrage · ${escapeHtml(opts.reference)}</p>
<p style="margin:0 0 16px;font-family:Outfit,Inter,Arial,sans-serif;font-size:22px;font-weight:600;">${escapeHtml(opts.name)}</p>
${summaryTable(rows.map(([label, value]) => ({ label, value })))}
<p style="margin:0;padding:16px;border-left:3px solid ${ACCENT};background:${PAPER};border-radius:6px;">${nl2br(opts.message)}</p>
${button(opts.adminUrl, "In der Verwaltung öffnen")}`,
  });
  const text = [`Neue Anfrage ${opts.reference}`, "", ...rows.map(([l, v]) => `${l}: ${v}`), "", opts.message, "", opts.adminUrl].join("\n");
  return { subject: `Neue Anfrage ${opts.reference} – ${opts.name}`, html, text };
}

export function offerAcceptedEmail(opts: {
  siteUrl: string;
  company: Company;
  number: string;
  customer: string;
  gross: string;
  acceptedBy: string;
  adminUrl: string;
}): EmailContent {
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `Angebot ${opts.number} wurde angenommen`,
    body: `<p style="margin:0 0 4px;font-size:13px;color:${STONE};">Gute Nachrichten 🎉</p>
<p style="margin:0 0 16px;font-family:Outfit,Inter,Arial,sans-serif;font-size:22px;font-weight:600;">Angebot ${escapeHtml(opts.number)} wurde angenommen</p>
${summaryTable([
  { label: "Kunde", value: opts.customer },
  { label: "Angenommen von", value: opts.acceptedBy },
  { label: "Gesamtbetrag", value: opts.gross, strong: true },
])}
${button(opts.adminUrl, "Angebot öffnen")}`,
  });
  return {
    subject: `✔ Angebot ${opts.number} angenommen – ${opts.customer}`,
    html,
    text: `Angebot ${opts.number} wurde von ${opts.acceptedBy} angenommen (${opts.customer}, ${opts.gross}).\n${opts.adminUrl}`,
  };
}

export function doubleOptInEmail(opts: { siteUrl: string; company: Company; name: string; confirmUrl: string }): EmailContent {
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: "Bitte bestätigen Sie Ihre Anmeldung",
    body: `<p style="margin:0 0 16px;">Hallo ${escapeHtml(opts.name)},</p>
<p style="margin:0 0 12px;">vielen Dank für Ihr Interesse an Neuigkeiten und Angeboten von ${escapeHtml(opts.company.name)}.</p>
<p style="margin:0 0 12px;">Bitte bestätigen Sie mit einem Klick, dass wir Ihnen gelegentlich Informationen zu unseren Leistungen, Aktionen und Neuigkeiten per E-Mail senden dürfen:</p>
${button(opts.confirmUrl, "Ja, ich möchte E-Mails erhalten")}
<p style="margin:18px 0 0;font-size:13px;color:${STONE};">Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail einfach – Sie erhalten dann keine Werbung von uns. Ihre Einwilligung können Sie jederzeit über den Abmeldelink in jeder E-Mail widerrufen.</p>`,
  });
  return {
    subject: `Bitte bestätigen: E-Mails von ${opts.company.name}`,
    html,
    text: `Hallo ${opts.name},\n\nbitte bestätigen Sie, dass wir Ihnen Informationen per E-Mail senden dürfen:\n${opts.confirmUrl}\n\nWenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail.`,
  };
}

export function campaignEmail(opts: { siteUrl: string; company: Company; subject: string; greeting: string; body: string; unsubscribeUrl: string; oneClickUrl: string }): EmailContent {
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: opts.subject,
    body: `<p style="margin:0 0 16px;">${escapeHtml(opts.greeting)}</p><div>${nl2br(opts.body)}</div>`,
    footerExtra: `<br><br>Sie erhalten diese E-Mail, weil Sie dem Empfang zugestimmt haben. <a href="${opts.unsubscribeUrl}" style="color:${STONE}">Hier abmelden</a>.`,
  });
  return {
    subject: opts.subject,
    html,
    text: `${opts.greeting}\n\n${opts.body}\n\n—\nAbmelden: ${opts.unsubscribeUrl}`,
    headers: {
      "List-Unsubscribe": `<${opts.oneClickUrl}>, <mailto:${opts.company.email}?subject=Abmelden>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

export function inviteEmail(opts: { siteUrl: string; company: Company; name: string; role: string; url: string }): EmailContent {
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: "Ihr Zugang zur QuickDesign-Verwaltung",
    body: `<p style="margin:0 0 16px;">Hallo ${escapeHtml(opts.name)},</p>
<p style="margin:0 0 12px;">Sie wurden als <strong>${escapeHtml(opts.role)}</strong> zur Verwaltung von ${escapeHtml(opts.company.name)} eingeladen. Bitte legen Sie über den folgenden Link Ihr Passwort fest:</p>
${button(opts.url, "Zugang einrichten")}
<p style="margin:18px 0 0;font-size:13px;color:${STONE};">Der Link ist nur kurze Zeit gültig und kann einmal verwendet werden.</p>`,
  });
  return { subject: `Einladung zur Verwaltung – ${opts.company.name}`, html, text: `Hallo ${opts.name},\n\nZugang einrichten: ${opts.url}` };
}
