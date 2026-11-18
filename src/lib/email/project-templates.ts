/** E-Mails rund um Aufträge: Statusmeldungen an Kunden, Termine, Einsatzplan fürs Team. */
import type { SmtpAttachment } from "@/lib/email/smtp";
import { ACCENT, button, escapeHtml, INK, layout, nl2br, PAPER, STONE, summaryTable, type Company, type EmailContent } from "./templates";
import {
  appointmentInfo,
  customerLabel,
  formatAppointment,
  mapsUrl,
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
<p style="margin:26px 0 0;">Mit freundlichen Grüßen<br><strong>${escapeHtml(opts.signature)}</strong><br>${escapeHtml(opts.company.name)}</p>`,
  });
  const text = [opts.greeting, "", message, "", `Status: ${projectStatusInfo[opts.status].step}`, ...rows.map((r) => `${r.label}: ${r.value}`), opts.onlineUrl ? `\nOnline: ${opts.onlineUrl}` : "", "", "Mit freundlichen Grüßen", opts.signature, opts.company.name].join("\n");
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
<p style="margin:26px 0 0;">Mit freundlichen Grüßen<br><strong>${escapeHtml(opts.signature)}</strong><br>${escapeHtml(opts.company.name)}</p>`,
  });
  const text = [opts.greeting, "", intro, "", ...rows.map((r) => `${r.label}: ${r.value}`), "", hint, `Telefon: ${opts.company.phone}`, "", "Mit freundlichen Grüßen", opts.signature, opts.company.name].join("\n");
  return {
    subject: `${opts.reminder ? "Erinnerung: " : ""}${info.noun} ${formatAppointment(p, { short: true })} – ${p.title}`.slice(0, 190),
    html,
    text,
    attachments: [opts.ics],
  };
}

type TeamEntry = { project: Project; items: { description: string; quantity: string }[]; adminUrl: string };

function teamBlock(e: TeamEntry) {
  const p = e.project;
  const info = appointmentInfo[p.appointment_type ?? "montage"];
  const address = siteAddress(p);
  const map = mapsUrl(p);
  const nav = navigationUrl(p);
  const contact = [p.site_contact_name || p.customer_name, p.site_contact_phone || p.phone].filter(Boolean).join(" · ");
  const tel = p.site_contact_phone || p.phone;
  const pill = (href: string, label: string, color = INK) =>
    `<a href="${href}" style="display:inline-block;margin:4px 6px 0 0;padding:9px 16px;border-radius:999px;background:${color};color:#fff;font-size:13px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border:1px solid #e6e2da;border-radius:14px;">
<tr><td style="padding:16px 18px;background:${PAPER};border-radius:14px 14px 0 0;">
  <div style="font-size:12px;color:${STONE};text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(info.label)} · ${escapeHtml(p.number)}</div>
  <div style="font-family:Outfit,Inter,Arial,sans-serif;font-size:19px;font-weight:700;margin-top:2px;">${escapeHtml(formatAppointment(p))}</div>
  <div style="font-size:15px;margin-top:4px;">${escapeHtml(customerLabel(p))} – ${escapeHtml(p.title)}</div>
</td></tr>
<tr><td style="padding:14px 18px;font-size:14px;line-height:1.6;">
  ${address ? `<div><strong>Ort:</strong> ${escapeHtml(address)}</div>` : `<div style="color:${STONE}">Kein Einsatzort hinterlegt</div>`}
  ${contact ? `<div><strong>Ansprechpartner:</strong> ${escapeHtml(contact)}</div>` : ""}
  ${p.collect_amount ? `<div style="margin-top:10px;padding:10px 12px;background:#fff4fa;border-left:3px solid ${ACCENT};border-radius:6px;"><strong>Vor Ort kassieren: ${escapeHtml(eur.format(p.collect_amount))}</strong></div>` : ""}
  ${p.crew_notes ? `<div style="margin-top:10px;"><strong>Hinweise fürs Team:</strong><br>${nl2br(p.crew_notes)}</div>` : ""}
  ${p.internal_notes ? `<div style="margin-top:10px;color:${STONE};"><strong>Interne Notizen:</strong><br>${nl2br(p.internal_notes)}</div>` : ""}
  ${e.items.length ? `<div style="margin-top:10px;"><strong>Positionen:</strong><br>${e.items.map((i) => `• ${escapeHtml(i.quantity)} ${escapeHtml(i.description)}`).join("<br>")}</div>` : ""}
  <div style="margin-top:12px;">
    ${nav ? pill(nav, "Route starten", ACCENT) : ""}${map ? pill(map, "Karte") : ""}${tel ? pill(`tel:${tel.replace(/[^\d+]/g, "")}`, "Anrufen") : ""}${pill(e.adminUrl, "Auftrag öffnen", STONE)}
  </div>
</td></tr></table>`;
}

function teamText(e: TeamEntry) {
  const p = e.project;
  const info = appointmentInfo[p.appointment_type ?? "montage"];
  return [
    `${info.label} · ${p.number}: ${formatAppointment(p)}`,
    `${customerLabel(p)} – ${p.title}`,
    `Ort: ${siteAddress(p) || "–"}`,
    `Karte: ${navigationUrl(p) ?? "–"}`,
    `Ansprechpartner: ${[p.site_contact_name || p.customer_name, p.site_contact_phone || p.phone].filter(Boolean).join(" · ")}`,
    p.collect_amount ? `VOR ORT KASSIEREN: ${eur.format(p.collect_amount)}` : "",
    p.crew_notes ? `Hinweise: ${p.crew_notes}` : "",
    p.internal_notes ? `Intern: ${p.internal_notes}` : "",
    ...e.items.map((i) => `- ${i.quantity} ${i.description}`),
    e.adminUrl,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Einzelner Termin fürs Team (bei Planung oder Änderung) */
export function appointmentTeamEmail(opts: { siteUrl: string; company: Company; entry: TeamEntry; changed: boolean; ics: SmtpAttachment }): EmailContent {
  const p = opts.entry.project;
  const info = appointmentInfo[p.appointment_type ?? "montage"];
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `${info.label} ${formatAppointment(p, { short: true })} – ${customerLabel(p)}`,
    body: `<p style="margin:0 0 4px;font-size:13px;color:${STONE};">${opts.changed ? "Termin geändert" : "Neuer Termin eingeplant"}</p>
<p style="margin:0 0 18px;font-family:Outfit,Inter,Arial,sans-serif;font-size:22px;font-weight:600;">${escapeHtml(info.label)} bei ${escapeHtml(customerLabel(p))}</p>
${teamBlock(opts.entry)}`,
  });
  return {
    subject: `${opts.changed ? "Geändert: " : ""}${info.label} ${formatAppointment(p, { short: true })} – ${customerLabel(p)}${p.site_city ? `, ${p.site_city}` : ""}`.slice(0, 190),
    html,
    text: `${opts.changed ? "Termin geändert" : "Neuer Termin"}\n\n${teamText(opts.entry)}`,
    attachments: [opts.ics],
  };
}

/** Einsatzplan für einen Tag (täglich am Vorabend) */
export function dailyPlanEmail(opts: { siteUrl: string; company: Company; dayLabel: string; entries: TeamEntry[]; planUrl: string }): EmailContent {
  const n = opts.entries.length;
  const collect = opts.entries.reduce((s, e) => s + (e.project.collect_amount ?? 0), 0);
  const html = layout({
    siteUrl: opts.siteUrl,
    company: opts.company,
    preheader: `${opts.dayLabel}: ${n} Termin${n === 1 ? "" : "e"}`,
    body: `<p style="margin:0 0 4px;font-size:13px;color:${STONE};">Einsatzplan</p>
<p style="margin:0 0 6px;font-family:Outfit,Inter,Arial,sans-serif;font-size:22px;font-weight:600;">${escapeHtml(opts.dayLabel)} – ${n} Termin${n === 1 ? "" : "e"}</p>
${collect ? `<p style="margin:0 0 18px;color:${STONE};">Insgesamt vor Ort zu kassieren: <strong style="color:${ACCENT}">${escapeHtml(eur.format(collect))}</strong></p>` : `<p style="margin:0 0 18px;"></p>`}
${opts.entries.map(teamBlock).join("")}
${button(opts.planUrl, "Alle Aufträge & Termine")}`,
  });
  return {
    subject: `Einsatzplan ${opts.dayLabel}: ${n} Termin${n === 1 ? "" : "e"}`.slice(0, 190),
    html,
    text: [`Einsatzplan ${opts.dayLabel}`, collect ? `Vor Ort kassieren gesamt: ${eur.format(collect)}` : "", "", ...opts.entries.map(teamText).flatMap((t) => [t, ""]), opts.planUrl].join("\n"),
  };
}
