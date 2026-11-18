/** E-Mails rund um Aufträge: Statusmeldungen an Kunden, Termine, Einsatzplan fürs Team. */
import type { SmtpAttachment } from "@/lib/email/smtp";
import { ACCENT, button, escapeHtml, INK, layout, nl2br, PAPER, STONE, summaryTable, type Company, type EmailContent } from "./templates";
import {
  appointmentInfo,
  customerLabel,
  formatAppointment,
  navigationUrl,
  projectStatusInfo,
  projectStatuses,
  siteAddress,
  type Project,
  type ProjectStatus,
} from "@/lib/projects/shared";

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

function progress(status: ProjectStatus) {
  const idx = projectStatuses.indexOf(status);
  const cells = projectStatuses
    .map((s, i) => {
      const done = i <= idx;
      return `<td width="25%" style="padding:0 3px;vertical-align:top;">
<div style="height:6px;border-radius:6px;background:${done ? ACCENT : "#e6e2da"};font-size:0;line-height:0;">&nbsp;</div>
<div style="padding-top:7px;font-size:12px;line-height:1.3;color:${done ? INK : STONE};font-weight:${i === idx ? 700 : 400};">${escapeHtml(projectStatusInfo[s].step)}</div></td>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 6px;"><tr>${cells}</tr></table>`;
}

const stageMessages: Record<ProjectStatus, { subject: string; text: string }> = {
  angenommen: {
    subject: "Auftragsbestätigung",
    text: "vielen Dank für Ihren Auftrag! Wir haben ihn eingeplant und melden uns, sobald es in die Umsetzung geht.",
  },
  in_arbeit: {
    subject: "Ihr Auftrag ist in Arbeit",
    text: "gute Nachrichten: Wir haben mit der Umsetzung Ihres Auftrags begonnen. Sobald alles fertig ist, geben wir Ihnen Bescheid.",
  },
  fertig: {
    subject: "Ihr Auftrag ist fertig",
    text: "Ihr Auftrag ist fertiggestellt. Den Termin für Montage, Lieferung bzw. Abholung stimmen wir mit Ihnen ab – falls bereits vereinbart, finden Sie ihn unten.",
  },
  abgeschlossen: {
    subject: "Auftrag abgeschlossen – vielen Dank",
    text: "Ihr Auftrag ist abgeschlossen. Vielen Dank für Ihr Vertrauen – wir freuen uns, wenn wir wieder für Sie tätig sein dürfen. Über eine kurze Rückmeldung freuen wir uns sehr.",
  },
};

export function projectStageEmail(opts: {
  siteUrl: string;
  company: Company;
  project: Project;
  status: ProjectStatus;
  greeting: string;
  message?: string | null;
  onlineUrl: string | null;
  signature: string;
}): EmailContent {
  const p = opts.project;
  const m = stageMessages[opts.status];
  const message = opts.message?.trim() || m.text;
  const rows = [
    { label: "Auftrag", value: `${p.number} · ${p.title}` },
    ...(p.appointment_date && p.appointment_type && opts.status !== "abgeschlossen"
      ? [{ label: appointmentInfo[p.appointment_type].noun, value: formatAppointment(p) }]
      : []),
  ];
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `${m.subject} – ${p.title}`,
    body: `<p style="margin:0 0 16px;">${escapeHtml(opts.greeting)}</p>
<p style="margin:0 0 6px;">${nl2br(message)}</p>
${progress(opts.status)}
${summaryTable(rows)}
${opts.onlineUrl ? button(opts.onlineUrl, "Auftragsstatus online ansehen") : ""}
<p style="margin:26px 0 0;">Mit freundlichen Grüßen<br><strong>${escapeHtml(opts.company.name)}</strong></p>`,
  });
  const text = [opts.greeting, "", message, "", `Status: ${projectStatusInfo[opts.status].step}`, ...rows.map((r) => `${r.label}: ${r.value}`), opts.onlineUrl ? `\nOnline: ${opts.onlineUrl}` : "", "", "Mit freundlichen Grüßen", opts.company.name].join("\n");
  return { subject: `${m.subject} – ${p.title}`.slice(0, 190), html, text };
}

export function appointmentCustomerEmail(opts: {
  siteUrl: string;
  company: Company;
  project: Project;
  greeting: string;
  reminder?: boolean;
  onlineUrl: string | null;
  signature: string;
  ics: SmtpAttachment;
}): EmailContent {
  const p = opts.project;
  const info = appointmentInfo[p.appointment_type ?? "montage"];
  const when = formatAppointment(p);
  const where = info.atCustomer ? siteAddress(p) : `${opts.company.street}, ${opts.company.postalCode} ${opts.company.city}`;
  const intro = opts.reminder
    ? `wir möchten Sie an Ihren ${info.noun} morgen erinnern:`
    : `wir haben folgenden ${info.noun} für Ihren Auftrag eingeplant:`;
  const rows = [
    { label: "Auftrag", value: p.title },
    { label: "Termin", value: when, strong: true },
    ...(where ? [{ label: info.atCustomer ? "Ort" : "Abholadresse", value: where }] : []),
    ...(p.collect_amount ? [{ label: "Restbetrag bei Übergabe", value: eur.format(p.collect_amount) }] : []),
  ];
  const hint = info.atCustomer
    ? "Bitte sorgen Sie dafür, dass der Arbeitsbereich frei zugänglich ist. Sollte der Termin nicht passen, melden Sie sich bitte kurz bei uns."
    : "Sollte der Termin nicht passen, melden Sie sich bitte kurz bei uns.";
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `${info.noun}: ${when}`,
    body: `<p style="margin:0 0 16px;">${escapeHtml(opts.greeting)}</p>
<p style="margin:0;">${escapeHtml(intro)}</p>
${summaryTable(rows)}
<p style="margin:0;color:${STONE};font-size:14px;">${escapeHtml(hint)} Telefon: ${escapeHtml(opts.company.phone)}</p>
<p style="margin:10px 0 0;color:${STONE};font-size:13px;">Den Termin können Sie über den Anhang direkt in Ihren Kalender übernehmen.</p>
${opts.onlineUrl ? button(opts.onlineUrl, "Auftrag online ansehen") : ""}
<p style="margin:26px 0 0;">Mit freundlichen Grüßen<br><strong>${escapeHtml(opts.company.name)}</strong></p>`,
  });
  const text = [opts.greeting, "", intro, "", ...rows.map((r) => `${r.label}: ${r.value}`), "", hint, `Telefon: ${opts.company.phone}`, "", "Mit freundlichen Grüßen", opts.company.name].join("\n");
  return {
    subject: `${opts.reminder ? "Erinnerung: " : ""}${info.noun} ${formatAppointment(p, { short: true })} – ${p.title}`.slice(0, 190),
    html,
    text,
    attachments: [opts.ics],
  };
}

export type PlanEntry = { project: Project; items: { description: string; quantity: string }[]; adminUrl: string };

const eurFmt = (n: number) => eur.format(n);

/** Eine Aufgabe im Einsatzplan – nummeriert, mit großem Navigations-Knopf */
function planBlock(e: PlanEntry, n: number, total: number, shopAddress: string) {
  const p = e.project;
  const type = p.appointment_type ?? "montage";
  const info = appointmentInfo[type];
  const inShop = !info.atCustomer;
  const address = inShop ? shopAddress : siteAddress(p);
  const nav = inShop ? null : navigationUrl(p);
  const who = customerLabel(p)?.trim();
  const contactName = p.site_contact_name || (p.kind === "aufgabe" ? null : p.customer_name);
  const tel = p.site_contact_phone || p.phone;
  const time = p.appointment_time ? `${p.appointment_time.slice(0, 5)} Uhr` : "Uhrzeit offen";
  const bigBtn = (href: string, label: string, color: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0;"><tr><td align="center" style="border-radius:12px;background:${color};">
<a href="${href}" style="display:block;padding:15px 12px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a></td></tr></table>`;
  const smallLink = (href: string, label: string) => `<a href="${href}" style="color:${INK};font-weight:600;text-decoration:underline;margin-right:16px;">${escapeHtml(label)}</a>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:2px solid ${INK};border-radius:16px;">
<tr><td style="padding:14px 18px;background:${INK};border-radius:13px 13px 0 0;color:#ffffff;">
  <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#f7a8d3;">Aufgabe ${n} von ${total}</div>
  <div style="font-family:Outfit,Inter,Arial,sans-serif;font-size:21px;font-weight:700;margin-top:3px;">${escapeHtml(time)} · ${escapeHtml(info.label)}</div>
</td></tr>
<tr><td style="padding:16px 18px 18px;font-size:15px;line-height:1.6;color:${INK};">
  <div style="font-size:17px;font-weight:700;">${escapeHtml(p.title)}</div>
  ${who ? `<div style="color:${STONE};">Kunde: ${escapeHtml(who)}</div>` : ""}
  <div style="margin-top:10px;"><strong>📍 ${inShop ? "Im Laden" : "Ort"}:</strong> ${address ? escapeHtml(address) : `<em style="color:${STONE}">kein Ort angegeben</em>`}</div>
  ${contactName || tel ? `<div><strong>👤 Vor Ort:</strong> ${escapeHtml([contactName, tel].filter(Boolean).join(" · "))}</div>` : ""}
  ${p.duration_hours ? `<div><strong>⏱ Dauer:</strong> ca. ${escapeHtml(String(p.duration_hours).replace(".", ","))} Std.</div>` : ""}
  ${p.collect_amount ? `<div style="margin-top:12px;padding:12px 14px;background:#fff0f7;border:2px solid ${ACCENT};border-radius:10px;font-size:16px;"><strong>💶 Bitte kassieren: ${escapeHtml(eurFmt(p.collect_amount))}</strong></div>` : ""}
  ${p.crew_notes ? `<div style="margin-top:12px;padding:12px 14px;background:${PAPER};border-radius:10px;"><strong>📝 Hinweise:</strong><br>${nl2br(p.crew_notes)}</div>` : ""}
  ${p.internal_notes ? `<div style="margin-top:8px;color:${STONE};font-size:14px;"><strong>Intern:</strong> ${nl2br(p.internal_notes)}</div>` : ""}
  ${e.items.length ? `<div style="margin-top:12px;font-size:14px;"><strong>Mitnehmen / Positionen:</strong><br>${e.items.map((i) => `• ${escapeHtml(i.quantity)} ${escapeHtml(i.description)}`).join("<br>")}</div>` : ""}
  ${nav ? bigBtn(nav, "📍 Navigation zum Einsatzort starten", ACCENT) : ""}
  <div style="margin-top:12px;font-size:14px;">${tel ? smallLink(`tel:${tel.replace(/[^\d+]/g, "")}`, "📞 Anrufen") : ""}${smallLink(e.adminUrl, "Details öffnen")}</div>
</td></tr></table>`;
}

function planText(e: PlanEntry, n: number, total: number, shopAddress: string) {
  const p = e.project;
  const info = appointmentInfo[p.appointment_type ?? "montage"];
  const inShop = !info.atCustomer;
  return [
    `===== AUFGABE ${n} VON ${total} =====`,
    `${formatAppointment(p)} · ${info.label}`,
    p.title,
    customerLabel(p)?.trim() ? `Kunde: ${customerLabel(p)}` : "",
    `Ort: ${(inShop ? shopAddress : siteAddress(p)) || "–"}`,
    !inShop && navigationUrl(p) ? `Navigation: ${navigationUrl(p)}` : "",
    [p.site_contact_name, p.site_contact_phone || p.phone].filter(Boolean).length ? `Vor Ort: ${[p.site_contact_name, p.site_contact_phone || p.phone].filter(Boolean).join(" · ")}` : "",
    p.collect_amount ? `BITTE KASSIEREN: ${eurFmt(p.collect_amount)}` : "",
    p.crew_notes ? `Hinweise: ${p.crew_notes}` : "",
    ...e.items.map((i) => `- ${i.quantity} ${i.description}`),
    `Details: ${e.adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const divider = (n: number) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr><td style="border-top:2px dashed #d9d4ca;font-size:0;line-height:0;">&nbsp;</td><td width="1" style="padding:0 10px;white-space:nowrap;font-size:12px;color:${STONE};">nächste Aufgabe (${n})</td><td style="border-top:2px dashed #d9d4ca;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;

/**
 * Einsatzplan: alle Aufgaben eines Tages in EINER E-Mail, nummeriert und klar getrennt.
 * Mit `urgent` als Sofort-Nachricht (z. B. kurzfristiger Termin).
 */
export function planEmail(opts: { siteUrl: string; company: Company; dayLabel: string; entries: PlanEntry[]; planUrl: string; urgent?: boolean; ics?: SmtpAttachment }): EmailContent {
  const n = opts.entries.length;
  const shop = `${opts.company.street}, ${opts.company.postalCode} ${opts.company.city}`;
  const collect = opts.entries.reduce((sum, e) => sum + (e.project.collect_amount ?? 0), 0);
  const overview = opts.entries
    .map((e, i) => {
      const p = e.project;
      const t = (p.appointment_time ?? "").slice(0, 5) || "–";
      return `<tr><td style="padding:6px 0;font-weight:700;width:28px;">${i + 1}.</td><td style="padding:6px 0;width:56px;">${escapeHtml(t)}</td><td style="padding:6px 0;">${escapeHtml(appointmentInfo[p.appointment_type ?? "montage"].label)} – ${escapeHtml(p.title)}${p.site_city ? `, ${escapeHtml(p.site_city)}` : ""}</td></tr>`;
    })
    .join("");
  const blocks = opts.entries.map((e, i) => (i ? divider(i + 1) : "") + planBlock(e, i + 1, n, shop)).join("");
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `${opts.urgent ? "DRINGEND – " : ""}${opts.dayLabel}: ${n} Aufgabe${n === 1 ? "" : "n"}`,
    body: `${opts.urgent ? `<div style="margin:0 0 14px;padding:10px 14px;background:${ACCENT};color:#fff;border-radius:10px;font-weight:700;">⚡ Dringend – kurzfristig eingeplant</div>` : ""}
<p style="margin:0 0 4px;font-size:13px;color:${STONE};">Einsatzplan</p>
<p style="margin:0 0 12px;font-family:Outfit,Inter,Arial,sans-serif;font-size:24px;font-weight:700;">${escapeHtml(opts.dayLabel)}</p>
${
  n > 1
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;padding:12px 16px;background:${PAPER};border-radius:12px;font-size:14px;">${overview}</table>`
    : ""
}
${collect ? `<p style="margin:6px 0 18px;">Insgesamt kassieren: <strong style="color:${ACCENT}">${escapeHtml(eurFmt(collect))}</strong></p>` : `<p style="margin:0 0 18px;"></p>`}
${blocks}
${button(opts.planUrl, "Alle Termine ansehen")}`,
  });
  const text = [
    `${opts.urgent ? "DRINGEND – " : ""}Einsatzplan ${opts.dayLabel} (${n} Aufgabe${n === 1 ? "" : "n"})`,
    collect ? `Insgesamt kassieren: ${eurFmt(collect)}` : "",
    "",
    ...opts.entries.flatMap((e, i) => [planText(e, i + 1, n, shop), ""]),
    opts.planUrl,
  ].join("\n");
  const first = opts.entries[0]?.project;
  const subject = opts.urgent && n === 1 && first
    ? `DRINGEND: ${appointmentInfo[first.appointment_type ?? "montage"].label} ${formatAppointment(first, { short: true })} – ${first.title}`
    : `${opts.urgent ? "DRINGEND – " : ""}Einsatzplan ${opts.dayLabel}: ${n} Aufgabe${n === 1 ? "" : "n"}`;
  return { subject: subject.slice(0, 190), html, text, attachments: opts.ics ? [opts.ics] : undefined };
}

/** Neue Datei(en) für einen Kollegen */
export function fileNotifyEmail(opts: {
  siteUrl: string;
  company: Company;
  from: string;
  files: { name: string; size: string }[];
  message: string | null;
  project: string | null;
  url: string;
}): EmailContent {
  const n = opts.files.length;
  const list = opts.files
    .map(
      (f) =>
        `<tr><td style="padding:9px 14px;font-size:14px;font-weight:600;color:${INK};border-bottom:1px solid #e6e2da;">📄 ${escapeHtml(f.name)}</td><td align="right" style="padding:9px 14px;font-size:13px;color:${STONE};border-bottom:1px solid #e6e2da;white-space:nowrap;">${escapeHtml(f.size)}</td></tr>`,
    )
    .join("");
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `${opts.from} hat ${n} Datei${n === 1 ? "" : "en"} für dich hochgeladen`,
    body: `<p style="margin:0 0 4px;font-size:13px;color:${STONE};">Neue Datei${n === 1 ? "" : "en"} für dich</p>
<p style="margin:0 0 16px;font-family:Outfit,Inter,Arial,sans-serif;font-size:22px;font-weight:700;">${escapeHtml(opts.from)} hat ${n} Datei${n === 1 ? "" : "en"} hochgeladen</p>
${opts.project ? `<p style="margin:0 0 12px;"><strong>Projekt:</strong> ${escapeHtml(opts.project)}</p>` : ""}
${opts.message ? `<div style="margin:0 0 16px;padding:14px 16px;background:${PAPER};border-left:3px solid ${ACCENT};border-radius:8px;">${nl2br(opts.message)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;border:1px solid #e6e2da;border-radius:10px;">${list}</table>
${button(opts.url, n === 1 ? "Datei öffnen" : "Dateien öffnen")}
<p style="margin:12px 0 0;font-size:13px;color:${STONE};">Zum Herunterladen ist die Anmeldung in der Verwaltung nötig.</p>`,
  });
  const text = [`${opts.from} hat ${n} Datei${n === 1 ? "" : "en"} hochgeladen.`, opts.project ? `Projekt: ${opts.project}` : "", opts.message ?? "", "", ...opts.files.map((f) => `- ${f.name} (${f.size})`), "", opts.url].filter((x) => x !== "").join("\n");
  return { subject: `Neue Datei${n === 1 ? "" : "en"}: ${opts.files[0]?.name ?? ""}${n > 1 ? ` (+${n - 1})` : ""}`.slice(0, 190), html, text };
}
