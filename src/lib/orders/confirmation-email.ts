import {
  DEFAULT_ORDER_CURRENCY,
  normalizeNonNegativeNumber,
} from "@/lib/orders/finance";
import type {
  LegacyConfigurationSelectedOptions,
  ServiceConfigurationSnapshot,
} from "@/lib/services/configuration/snapshot";

type CustomerOrderConfirmationItem = {
  serviceName: string;
  quantity: number;
  totalPrice: number | null | undefined;
  selectedOptions: LegacyConfigurationSelectedOptions;
  configurationSnapshot?: ServiceConfigurationSnapshot;
};

type CustomerOrderConfirmationEmailInput = {
  orderNumber: string;
  publicOrderCode?: string | null;
  orderDate: Date;
  customerName?: string | null;
  trackUrl?: string | null;
  contactEmail?: string | null;
  currency?: string | null;
  subtotalNet?: number | null;
  taxAmount?: number | null;
  totalGross?: number | null;
  items: CustomerOrderConfirmationItem[];
};

type CustomerOrderConfirmationEmail = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalizeNonNegativeNumber(amount));
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
  }).format(value);
}

function collectReadableOptionLines(
  item: CustomerOrderConfirmationItem,
): string[] {
  if (item.configurationSnapshot?.selectedOptions.length) {
    return item.configurationSnapshot.selectedOptions
      .map((option) => {
        const fieldLabel = option.fieldLabel.trim();
        const valueLabel = option.valueLabel.trim();

        if (!fieldLabel || !valueLabel) {
          return null;
        }

        return `${fieldLabel}: ${valueLabel}`;
      })
      .filter((value): value is string => value !== null)
      .slice(0, 4);
  }

  return Object.values(item.selectedOptions)
    .map((option) => {
      const optionName = option.optionName.trim();
      const valueName = option.valueName.trim();

      if (!optionName || !valueName) {
        return null;
      }

      return `${optionName}: ${valueName}`;
    })
    .filter((value): value is string => value !== null)
    .slice(0, 4);
}

function buildItemTextLines(
  item: CustomerOrderConfirmationItem,
  currency: string,
): string[] {
  const itemLines = [
    `${item.serviceName} x${Math.max(1, Math.trunc(item.quantity))}`,
  ];
  const optionLines = collectReadableOptionLines(item);

  optionLines.forEach((optionLine) => {
    itemLines.push(`- ${optionLine}`);
  });

  if (typeof item.totalPrice === "number" && Number.isFinite(item.totalPrice)) {
    itemLines.push(`Preis: ${formatCurrency(item.totalPrice, currency)}`);
  }

  return itemLines;
}

function buildItemHtml(
  item: CustomerOrderConfirmationItem,
  currency: string,
): string {
  const optionLines = collectReadableOptionLines(item);
  const priceMarkup =
    typeof item.totalPrice === "number" && Number.isFinite(item.totalPrice)
      ? `<div style="margin-top:8px;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(formatCurrency(item.totalPrice, currency))}</div>`
      : "";

  return `
    <tr>
      <td style="padding:0 0 14px;">
        <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;background:#ffffff;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;">
            ${escapeHtml(item.serviceName)}
          </div>
          <div style="margin-top:4px;font-size:13px;color:#475569;">
            Menge: ${escapeHtml(String(Math.max(1, Math.trunc(item.quantity))))}
          </div>
          ${
            optionLines.length > 0
              ? `<div style="margin-top:10px;font-size:13px;color:#475569;">${optionLines
                  .map((optionLine) => `<div>${escapeHtml(optionLine)}</div>`)
                  .join("")}</div>`
              : ""
          }
          ${priceMarkup}
        </div>
      </td>
    </tr>
  `;
}

function buildTotalsTextLines(
  input: CustomerOrderConfirmationEmailInput,
  currency: string,
): string[] {
  const lines: string[] = [];

  if (typeof input.subtotalNet === "number" && Number.isFinite(input.subtotalNet)) {
    lines.push(`Zwischensumme: ${formatCurrency(input.subtotalNet, currency)}`);
  }

  if (typeof input.taxAmount === "number" && Number.isFinite(input.taxAmount)) {
    lines.push(`MwSt.: ${formatCurrency(input.taxAmount, currency)}`);
  }

  if (typeof input.totalGross === "number" && Number.isFinite(input.totalGross)) {
    lines.push(`Gesamt: ${formatCurrency(input.totalGross, currency)}`);
  }

  return lines;
}

export function buildCustomerOrderConfirmationEmail(
  input: CustomerOrderConfirmationEmailInput,
): CustomerOrderConfirmationEmail {
  const currency = input.currency?.trim().toUpperCase() || DEFAULT_ORDER_CURRENCY;
  const publicOrderCode = input.publicOrderCode?.trim() || null;
  const subjectReference = publicOrderCode || input.orderNumber;
  const subject = `Bestätigung Ihrer Bestellung ${subjectReference}`;
  const greetingName = input.customerName?.trim()
    ? `Hallo ${input.customerName.trim()}`
    : "Guten Tag";
  const dateLabel = formatDate(input.orderDate);
  const itemTextBlocks = input.items.map((item) =>
    buildItemTextLines(item, currency).join("\n"),
  );
  const totalsTextLines = buildTotalsTextLines(input, currency);
  const trackLine = input.trackUrl?.trim()
    ? `Auftragsstatus: ${input.trackUrl.trim()}`
    : "Den Auftragsstatus können Sie jederzeit auf unserer Tracking-Seite abrufen.";
  const footerContact = input.contactEmail?.trim() || "info@quickdesign.de";
  const text = [
    `${greetingName},`,
    "",
    "vielen Dank für Ihre Bestellung.",
    ...(publicOrderCode ? [`Tracking-Code: ${publicOrderCode}`] : []),
    `Bestellnummer: ${input.orderNumber}`,
    `Bestelldatum: ${dateLabel}`,
    "",
    "Bestellte Positionen:",
    ...itemTextBlocks.flatMap((block) => [block, ""]),
    ...(totalsTextLines.length > 0
      ? ["Zahlungsübersicht:", ...totalsTextLines, ""]
      : []),
    "Wir haben Ihre Bestellung erhalten und melden uns bei Rückfragen.",
    ...(publicOrderCode
      ? [
          "Bitte verwenden Sie für Rückfragen und Tracking Ihren Tracking-Code zusammen mit Ihrer E-Mail-Adresse.",
        ]
      : []),
    trackLine,
    "",
    "QuickDesign",
    footerContact,
  ]
    .join("\n")
    .trim();

  const html = `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 22px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);border-bottom:1px solid #e2e8f0;">
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:#64748b;">QuickDesign</div>
            <div style="margin-top:10px;font-size:28px;line-height:1.2;font-weight:700;color:#0f172a;">Bestellung eingegangen</div>
            <div style="margin-top:10px;font-size:15px;line-height:1.6;color:#475569;">
              ${escapeHtml(greetingName)}, vielen Dank für Ihre Bestellung. Wir haben Ihren Auftrag erfolgreich erhalten.
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:0 0 6px;font-size:13px;font-weight:700;color:#64748b;">Bestellnummer</td>
              </tr>
              <tr>
                <td style="padding:0 0 14px;font-size:18px;font-weight:700;color:#0f172a;">#${escapeHtml(input.orderNumber)}</td>
              </tr>
              ${
                publicOrderCode
                  ? `<tr>
                      <td style="padding:0 0 6px;font-size:13px;font-weight:700;color:#64748b;">Tracking-Code</td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 14px;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(publicOrderCode)}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding:0 0 6px;font-size:13px;font-weight:700;color:#64748b;">Bestelldatum</td>
              </tr>
              <tr>
                <td style="padding:0 0 20px;font-size:15px;color:#0f172a;">${escapeHtml(dateLabel)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 10px;">
            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;">Ihre Positionen</div>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${input.items.map((item) => buildItemHtml(item, currency)).join("")}
            </table>
          </td>
        </tr>
        ${
          totalsTextLines.length > 0
            ? `<tr>
                <td style="padding:0 28px 18px;">
                  <div style="border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:16px 18px;">
                    ${totalsTextLines
                      .map((line, index) => {
                        const [label, value] = line.split(": ");

                        return `<div style="display:flex;justify-content:space-between;gap:16px;${
                          index < totalsTextLines.length - 1
                            ? "margin-bottom:8px;"
                            : ""
                        }"><span style="font-size:13px;color:#475569;">${escapeHtml(label ?? "")}</span><span style="font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(value ?? "")}</span></div>`;
                      })
                      .join("")}
                  </div>
                </td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding:0 28px 28px;">
            <div style="font-size:14px;line-height:1.7;color:#475569;">
              Wir haben Ihre Bestellung erhalten und melden uns bei Rückfragen.
            </div>
            ${
              publicOrderCode
                ? `<div style="margin-top:14px;font-size:14px;line-height:1.7;color:#475569;">
                    Verwenden Sie für Tracking und Rückfragen bitte den Code <strong style="color:#0f172a;">${escapeHtml(publicOrderCode)}</strong> zusammen mit Ihrer E-Mail-Adresse.
                  </div>`
                : ""
            }
            <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#475569;">
              ${
                input.trackUrl?.trim()
                  ? `Auftragsstatus: <a href="${escapeHtml(input.trackUrl.trim())}" style="color:#0f172a;font-weight:700;text-decoration:none;">Tracking öffnen</a>`
                  : "Den Auftragsstatus können Sie jederzeit auf unserer Tracking-Seite abrufen."
              }
            </div>
            <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#64748b;">
              <div style="font-weight:700;color:#0f172a;">QuickDesign</div>
              <div>${escapeHtml(footerContact)}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  return {
    subject,
    text,
    html,
  };
}
