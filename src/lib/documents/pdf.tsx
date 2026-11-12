import "server-only";
import path from "node:path";
import { Defs, Document, Font, LinearGradient, Page, Path, Rect, Stop, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { BRAND_COLORS, LOGO_ARCS, LOGO_CORE, LOGO_SEGMENTS, LOGO_WORDMARK } from "@/components/brand/logo-paths";
import type { Settings } from "@/lib/settings/schema";
import { computeTotals, formatDateDE, formatEuro, formatQty, kindLabels, lineNet } from "./format";
import type { Doc } from "./queries";

/**
 * PDF-Layout für Angebote und Rechnungen (DIN-5008-nahe: Anschriftfeld links,
 * Infoblock rechts, Pflichtangaben nach § 14 UStG in Kopf, Summen und Fußzeile).
 */
const ASSETS = path.join(process.cwd(), "src/assets/pdf");
let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Inter",
    fonts: [400, 500, 600, 700].map((w) => ({ src: path.join(ASSETS, `inter-latin-${w}-normal.woff`), fontWeight: w })),
  });
  Font.register({
    family: "Outfit",
    fonts: [500, 600].map((w) => ({ src: path.join(ASSETS, `outfit-latin-${w}-normal.woff`), fontWeight: w })),
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const INK = "#0b0b0c";
const TEXT = "#1d1d20";
const MUTED = "#6b6862";
const LINE = "#e4e1da";
const SOFT = "#f6f4f0";
const ACCENT = BRAND_COLORS.magenta;
const CYAN = BRAND_COLORS.cyan;
const MM = 2.8346;

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 8.8, color: TEXT, paddingTop: 14 * MM, paddingBottom: 27 * MM, paddingLeft: 20 * MM, paddingRight: 18 * MM, lineHeight: 1.45 },
  band: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 * MM },
  docBadge: { alignItems: "flex-end" },
  docKind: { fontFamily: "Outfit", fontSize: 22, fontWeight: 600, color: INK, letterSpacing: -0.5, lineHeight: 1.15 },
  docNumber: { fontSize: 8.5, color: MUTED, marginTop: 3, lineHeight: 1.2 },
  senderLine: { fontSize: 6.6, color: MUTED, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 2, marginBottom: 5, width: 85 * MM },
  addressRow: { flexDirection: "row", justifyContent: "space-between", minHeight: 34 * MM },
  address: { fontSize: 9.6, lineHeight: 1.45, width: 85 * MM },
  meta: { width: 64 * MM, backgroundColor: SOFT, borderRadius: 4, padding: 8, alignSelf: "flex-start" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.6 },
  metaLabel: { color: MUTED, fontSize: 7.8 },
  metaValue: { fontSize: 8.2, fontWeight: 600, color: INK, textAlign: "right", maxWidth: 38 * MM },
  title: { fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: INK, marginTop: 4 * MM, lineHeight: 1.2 },
  reference: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  intro: { marginTop: 4 * MM, fontSize: 9.2, lineHeight: 1.55 },
  table: { marginTop: 5 * MM },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4, paddingHorizontal: 4, fontSize: 7.2, fontWeight: 600, color: INK, textTransform: "uppercase", letterSpacing: 0.4 },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: LINE },
  cPos: { width: "6%", color: MUTED },
  cDesc: { width: "44%", paddingRight: 8 },
  cQty: { width: "11%", textAlign: "right" },
  cVat: { width: "8%", textAlign: "right", color: MUTED },
  cPrice: { width: "15%", textAlign: "right" },
  cSum: { width: "16%", textAlign: "right" },
  itemTitle: { fontWeight: 600, color: INK },
  itemDetails: { color: MUTED, fontSize: 7.8, marginTop: 1.5, lineHeight: 1.45 },
  totals: { marginTop: 4 * MM, marginLeft: "auto", width: 80 * MM },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.2, paddingHorizontal: 4 },
  totGross: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: INK, color: "#ffffff", paddingVertical: 8, paddingHorizontal: 9, marginTop: 5, borderRadius: 4 },
  grossValue: { fontFamily: "Outfit", fontWeight: 600, fontSize: 13, color: "#ffffff" },
  paidRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.2, paddingHorizontal: 4, color: MUTED },
  boxes: { marginTop: 5 * MM, flexDirection: "row", gap: 7 * MM },
  box: { flex: 1 },
  boxTitle: { fontSize: 7.4, fontWeight: 600, color: INK, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2.5 },
  boxText: { fontSize: 8.3, lineHeight: 1.5 },
  payBox: { marginTop: 5 * MM, borderLeftWidth: 2, borderLeftColor: ACCENT, paddingLeft: 8, paddingVertical: 3 },
  closing: { marginTop: 5 * MM, fontSize: 9.2 },
  acceptance: { marginTop: 7 * MM, flexDirection: "row", gap: 10 * MM },
  signLine: { flex: 1, borderTopWidth: 0.6, borderTopColor: MUTED, paddingTop: 3, fontSize: 7.2, color: MUTED },
  stamp: { marginTop: 4 * MM, alignSelf: "flex-start", borderWidth: 1, borderColor: "#16a34a", color: "#16a34a", borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8, fontSize: 8.5, fontWeight: 600 },
  footer: { position: "absolute", bottom: 10 * MM, left: 20 * MM, right: 18 * MM, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", fontSize: 6.6, color: MUTED, lineHeight: 1.55 },
  footCol: { width: "24%" },
  footStrong: { fontWeight: 600, color: INK },
  pageNo: { position: "absolute", top: 289 * MM, left: 20 * MM, right: 18 * MM, textAlign: "right", fontSize: 6.4, color: MUTED },
});

function PdfLogo({ width }: { width: number }) {
  const height = (width * 812) / 1940;
  return (
    <Svg viewBox="24 594 1940 812" style={{ width, height }}>
      {LOGO_SEGMENTS.map((seg, i) => (
        <Path key={`s${i}`} d={seg.d} fill={BRAND_COLORS[seg.color]} />
      ))}
      {LOGO_ARCS.map((d, i) => (
        <Path key={`a${i}`} d={d} fill={INK} />
      ))}
      <Path d={LOGO_CORE} fill={INK} />
      {LOGO_WORDMARK.map((d, i) => (
        <Path key={`w${i}`} d={d} fill={INK} />
      ))}
    </Svg>
  );
}

function Band() {
  return (
    <Svg fixed style={s.band} viewBox="0 0 600 3" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="qdband" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={ACCENT} />
          <Stop offset="1" stopColor={CYAN} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="600" height="3" fill="url(#qdband)" />
    </Svg>
  );
}

function DocumentPdf({ doc, settings }: { doc: Doc; settings: Settings }) {
  const isOffer = doc.kind === "angebot";
  const label = kindLabels[doc.kind];
  const small = settings.tax.smallBusiness;
  const t = computeTotals(doc.items, doc.discount_percent, small);
  const c = settings.company;
  const bank = settings.bank;
  const open = Math.max(0, Math.round((t.gross - doc.paid_amount) * 100) / 100);

  const addressLines = [
    doc.company_name,
    [doc.customer_salutation && doc.customer_salutation !== "Divers" ? doc.customer_salutation : null, doc.customer_name].filter(Boolean).join(" "),
    doc.street,
    [doc.postal_code, doc.city].filter(Boolean).join(" "),
    doc.country && doc.country !== "Deutschland" ? doc.country : null,
  ].filter((l): l is string => !!l && l.trim().length > 0);

  const metaRows: [string, string][] = [
    [label.numberLabel, doc.number ?? "Entwurf"],
    [isOffer ? "Angebotsdatum" : "Rechnungsdatum", formatDateDE(doc.doc_date)],
    ...(isOffer && doc.valid_until ? ([["Gültig bis", formatDateDE(doc.valid_until)]] as [string, string][]) : []),
    ...(!isOffer && doc.service_period ? ([["Leistungszeitraum", doc.service_period]] as [string, string][]) : []),
    ...(!isOffer && doc.due_date ? ([["Fällig am", formatDateDE(doc.due_date)]] as [string, string][]) : []),
    ...(doc.customer_vat_id ? ([["Ihre USt-IdNr.", doc.customer_vat_id]] as [string, string][]) : []),
  ];

  const taxLine = [c.vatId ? `USt-IdNr.: ${c.vatId}` : null, c.taxNumber ? `Steuernr.: ${c.taxNumber}` : null].filter(Boolean) as string[];

  return (
    <Document title={`${label.one} ${doc.number ?? "Entwurf"}`} author={c.name} subject={doc.title} creator={c.name} producer={c.name} language="de-DE">
      <Page size="A4" style={s.page}>
        <Band />
        <View style={s.header}>
          <PdfLogo width={56 * MM} />
          <View style={s.docBadge}>
            <Text style={s.docKind}>{label.one}</Text>
            <Text style={s.docNumber}>{doc.number ?? "Entwurf – nicht gültig"}</Text>
          </View>
        </View>

        <View style={s.addressRow}>
          <View>
            <Text style={s.senderLine}>
              {c.name} · {c.street} · {c.postalCode} {c.city}
            </Text>
            <View style={s.address}>
              {addressLines.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </View>
          </View>
          <View style={s.meta}>
            {metaRows.map(([k, v]) => (
              <View key={k} style={s.metaRow}>
                <Text style={s.metaLabel}>{k}</Text>
                <Text style={s.metaValue}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.title}>{doc.title || label.one}</Text>
        {doc.reference ? <Text style={s.reference}>{doc.reference}</Text> : null}
        {doc.intro ? <Text style={s.intro}>{doc.intro}</Text> : null}

        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={s.cPos}>Pos.</Text>
            <Text style={s.cDesc}>Leistung</Text>
            <Text style={s.cQty}>Menge</Text>
            {!small ? <Text style={s.cVat}>USt.</Text> : <Text style={s.cVat} />}
            <Text style={s.cPrice}>Einzelpreis</Text>
            <Text style={s.cSum}>Gesamt</Text>
          </View>
          {doc.items.map((it, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cPos}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={s.cDesc}>
                <Text style={s.itemTitle}>{it.description}</Text>
                {it.details ? <Text style={s.itemDetails}>{it.details}</Text> : null}
              </View>
              <Text style={s.cQty}>
                {formatQty(it.quantity)} {it.unit}
              </Text>
              <Text style={s.cVat}>{small ? "" : `${it.vat_rate} %`}</Text>
              <Text style={s.cPrice}>{formatEuro(it.unit_price)}</Text>
              <Text style={[s.cSum, { fontWeight: 600, color: INK }]}>{formatEuro(lineNet(it))}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          {t.discount > 0 ? (
            <>
              <View style={s.totRow}>
                <Text>Zwischensumme</Text>
                <Text>{formatEuro(t.subtotal)}</Text>
              </View>
              <View style={s.totRow}>
                <Text>Rabatt {formatQty(doc.discount_percent)} %</Text>
                <Text>− {formatEuro(t.discount)}</Text>
              </View>
            </>
          ) : null}
          <View style={s.totRow}>
            <Text>{small ? "Gesamtbetrag netto" : "Nettobetrag"}</Text>
            <Text>{formatEuro(t.net)}</Text>
          </View>
          {!small
            ? t.groups.map((g) => (
                <View key={g.rate} style={s.totRow}>
                  <Text>
                    zzgl. {g.rate} % USt.{t.groups.length > 1 ? ` auf ${formatEuro(g.net)}` : ""}
                  </Text>
                  <Text>{formatEuro(g.vat)}</Text>
                </View>
              ))
            : null}
          <View style={s.totGross}>
            <Text style={{ fontWeight: 600 }}>{isOffer ? "Angebotssumme" : "Rechnungsbetrag"}</Text>
            <Text style={s.grossValue}>{formatEuro(t.gross)}</Text>
          </View>
          {!isOffer && doc.paid_amount > 0 ? (
            <>
              <View style={s.paidRow}>
                <Text>Bereits bezahlt</Text>
                <Text>− {formatEuro(doc.paid_amount)}</Text>
              </View>
              <View style={[s.totRow, { fontWeight: 600, color: INK }]}>
                <Text>Offener Betrag</Text>
                <Text>{formatEuro(open)}</Text>
              </View>
            </>
          ) : null}
        </View>

        {small ? (
          <Text style={{ marginTop: 3 * MM, fontSize: 8, color: MUTED }}>
            Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
          </Text>
        ) : null}

        {!isOffer && doc.status !== "bezahlt" && bank.iban ? (
          <View style={s.payBox} wrap={false}>
            <Text style={s.boxTitle}>Zahlung</Text>
            <Text style={s.boxText}>
              Bitte überweisen Sie {formatEuro(open || t.gross)}
              {doc.due_date ? ` bis zum ${formatDateDE(doc.due_date)}` : ""} auf folgendes Konto:
            </Text>
            <Text style={s.boxText}>
              {bank.holder || c.name} · IBAN {bank.iban}
              {bank.bic ? ` · BIC ${bank.bic}` : ""}
              {bank.bankName ? ` · ${bank.bankName}` : ""}
            </Text>
            <Text style={s.boxText}>Verwendungszweck: {doc.number}</Text>
          </View>
        ) : null}
        {!isOffer && doc.status === "bezahlt" ? <Text style={s.stamp}>✓ Bezahlt{doc.paid_at ? ` am ${formatDateDE(doc.paid_at)}` : ""} – vielen Dank!</Text> : null}

        {doc.notes || doc.payment_terms ? (
          <View style={s.boxes} wrap={false}>
            {doc.notes ? (
              <View style={s.box}>
                <Text style={s.boxTitle}>Hinweise</Text>
                <Text style={s.boxText}>{doc.notes}</Text>
              </View>
            ) : null}
            {doc.payment_terms ? (
              <View style={s.box}>
                <Text style={s.boxTitle}>Zahlungsbedingungen</Text>
                <Text style={s.boxText}>{doc.payment_terms}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={s.closing} wrap={false}>
          {doc.closing ? <Text>{doc.closing}</Text> : null}
          <Text style={{ marginTop: 7 }}>Mit freundlichen Grüßen</Text>
          <Text style={{ marginTop: 2, fontWeight: 600, color: INK }}>{c.owner || c.name}</Text>
          <Text style={{ color: MUTED }}>{c.name}</Text>
        </View>

        {isOffer && doc.accepted_at ? (
          <Text style={s.stamp}>
            ✓ Angenommen am {formatDateDE(doc.accepted_at)} von {doc.accepted_name}
          </Text>
        ) : null}
        {isOffer && !doc.accepted_at ? (
          <View style={s.acceptance} wrap={false}>
            <Text style={s.signLine}>Ort, Datum</Text>
            <Text style={s.signLine}>Auftrag erteilt – Unterschrift Kunde</Text>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <View style={s.footCol}>
            <Text style={s.footStrong}>{c.name}</Text>
            {c.owner ? <Text>Inhaber: {c.owner}</Text> : null}
            <Text>{c.street}</Text>
            <Text>
              {c.postalCode} {c.city}
            </Text>
          </View>
          <View style={s.footCol}>
            <Text style={s.footStrong}>Kontakt</Text>
            <Text>Tel. {c.phone}</Text>
            <Text>{c.email}</Text>
            <Text>{c.website}</Text>
          </View>
          <View style={s.footCol}>
            <Text style={s.footStrong}>Bankverbindung</Text>
            {bank.iban ? (
              <>
                {bank.bankName ? <Text>{bank.bankName}</Text> : null}
                <Text>IBAN {bank.iban}</Text>
                {bank.bic ? <Text>BIC {bank.bic}</Text> : null}
              </>
            ) : (
              <Text>auf Anfrage</Text>
            )}
          </View>
          <View style={s.footCol}>
            <Text style={s.footStrong}>Steuer & Register</Text>
            {taxLine.length ? taxLine.map((l) => <Text key={l}>{l}</Text>) : <Text>–</Text>}
            {c.register ? <Text>{c.register}</Text> : null}
          </View>
        </View>
        <Text style={s.pageNo} fixed render={({ pageNumber, totalPages }) => `${label.one} ${doc.number ?? "Entwurf"} · Seite ${pageNumber} von ${totalPages}`} />
      </Page>
    </Document>
  );
}

export async function renderDocumentPdf(doc: Doc, settings: Settings): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<DocumentPdf doc={doc} settings={settings} />);
}
