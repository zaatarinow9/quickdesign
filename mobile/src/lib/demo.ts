/**
 * Vorschau-Modus mit Beispieldaten (EXPO_PUBLIC_DEMO=1) – nur für Bildschirmfotos/Präsentation.
 * Im echten Build ist der Modus aus.
 */
export const DEMO = process.env.EXPO_PUBLIC_DEMO === "1";

const now = Date.now();
const ago = (min: number) => new Date(now - min * 60000).toISOString();
const day = (d: number) => new Date(now + d * 86400000).toISOString().slice(0, 10);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const inquiries = [
  { id: id(1), reference: "QD-000184", status: "neu", name: "Laura Becker", company_name: "Café Lindenblatt", email: "laura@lindenblatt.de", phone: "+49 681 123456", message: "Hallo, wir brauchen eine neue Schaufensterbeschriftung und 500 Flyer für unsere Neueröffnung am 1. Dezember. Können Sie uns ein Angebot machen?", interests: ["Schaufenster", "Flyer"], internal_notes: null, created_at: ago(14), landing_page: "/leistungen" },
  { id: id(2), reference: "QD-000183", status: "neu", name: "Ahmad Al-Hassan", company_name: null, email: "ahmad@example.de", phone: "+49 176 5550123", message: "Ich möchte meinen Lieferwagen komplett folieren lassen (VW Crafter). Was kostet das ungefähr?", interests: ["Fahrzeugbeschriftung"], internal_notes: null, created_at: ago(95), landing_page: "/" },
  { id: id(3), reference: "QD-000181", status: "in_bearbeitung", name: "Thomas Wagner", company_name: "Wagner Bau GmbH", email: "t.wagner@wagner-bau.de", phone: "+49 681 987654", message: "Bauzaunbanner 3,40 × 1,73 m, 6 Stück mit Logo.", interests: ["Banner"], internal_notes: "Angebot bis Freitag", created_at: ago(60 * 26), landing_page: "/" },
  { id: id(4), reference: "QD-000179", status: "erledigt", name: "Sara Nouri", company_name: "Praxis Nouri", email: "info@praxis-nouri.de", phone: null, message: "Praxisschild aus Acryl, 60 × 40 cm.", interests: ["Schilder"], internal_notes: null, created_at: ago(60 * 72), landing_page: "/" },
];

const projects = [
  { id: id(11), number: "AU-2026-0142", title: "Schaufenster Café Lindenblatt", kind: "auftrag", status: "in_arbeit", customer_name: "Laura Becker", company_name: "Café Lindenblatt", email: "laura@lindenblatt.de", phone: "+49 681 123456", appointment_type: "montage", appointment_date: day(0), appointment_time: "09:30:00", duration_hours: 3, site_street: "Bahnhofstraße 42", site_postal_code: "66111", site_city: "Saarbrücken", site_contact_name: "Laura Becker", site_contact_phone: "+49 681 123456", crew_notes: "Folie liegt im Lager Regal B. Leiter mitnehmen, Fenster vorher reinigen.", collect_amount: 450, internal_notes: null, value_gross: 1290, maps_url: "https://maps.apple.com/?q=Saarbrücken", navigation_url: "https://maps.apple.com/?q=Saarbrücken" },
  { id: id(12), number: "TE-2026-0088", title: "Material abholen – Folien", kind: "aufgabe", status: "angenommen", customer_name: "QuickDesign", company_name: null, appointment_type: "besorgung", appointment_date: day(0), appointment_time: "14:00:00", site_city: "Völklingen" },
  { id: id(13), number: "AU-2026-0139", title: "Fahrzeugfolierung VW Crafter", kind: "auftrag", status: "angenommen", customer_name: "Ahmad Al-Hassan", company_name: null, appointment_type: "abholung", appointment_date: day(1), appointment_time: "10:00:00", site_city: "Saarbrücken" },
  { id: id(14), number: "AU-2026-0135", title: "Bauzaunbanner 6 Stück", kind: "auftrag", status: "fertig", customer_name: "Thomas Wagner", company_name: "Wagner Bau GmbH", appointment_type: "lieferung", appointment_date: day(2), appointment_time: "08:00:00", site_city: "St. Ingbert" },
];

const files = [
  { id: id(21), name: "Lindenblatt_Schaufenster_final.pdf", size: 18400000, status: "bearbeitung", folder: "Kunden/Café Lindenblatt", assigned_to: "max@quickdesign24.de", uploaded_by: "Max", created_at: ago(40), thumb: null, message: "Bitte auf weißer Folie drucken", content_type: "application/pdf", project_id: id(11), width: null, height: null },
  { id: id(22), name: "Crafter_Seitenansicht.ai", size: 54200000, status: "bearbeitung", folder: "Kunden/Al-Hassan", assigned_to: null, uploaded_by: "Sami", created_at: ago(180), thumb: null, message: null, content_type: "application/postscript", project_id: null, width: null, height: null },
  { id: id(23), name: "Banner_Wagner_340x173.pdf", size: 9600000, status: "bearbeitung", folder: "Druck/2026-11-21", assigned_to: null, uploaded_by: "Max", created_at: ago(300), thumb: null, message: null, content_type: "application/pdf", project_id: id(14), width: null, height: null },
  { id: id(24), name: "Foto Fassade.jpg", size: 3100000, status: "neu", folder: "App-Uploads/2026-11-21", assigned_to: null, uploaded_by: "App", created_at: ago(8), thumb: null, message: null, content_type: "image/jpeg", project_id: null, width: null, height: null },
];

const shop = [
  { id: id(31), number: "SH-2026-0027", status: "bezahlt", name: "Omar Khalil", email: "omar@example.de", phone: "+49 160 1112233", shipping_method: "Express", amount_total: 7176, amount_subtotal: 5886, amount_shipping: 1290, items: [{ description: "T-Shirt „Hurriya“ – Schwarz – L", quantity: 2, amount: 4784 }, { description: "Fahne 90 × 150 cm", quantity: 1, amount: 1102 }], shipping_address: { line1: "Hauptstraße 5", postal_code: "66117", city: "Saarbrücken", country: "DE" }, livemode: true, created_at: ago(25) },
  { id: id(32), number: "SH-2026-0026", status: "in_produktion", name: "Rana Haddad", email: "rana@example.de", phone: null, shipping_method: "Standardversand", amount_total: 4384, amount_subtotal: 3894, amount_shipping: 490, items: [{ description: "Hoodie selbst gestalten – Olivgrün – M", quantity: 1, amount: 3894 }], shipping_address: {}, livemode: true, created_at: ago(240) },
];

const notifications = [
  { id: 5, category: "anfrage", title_de: "Neue Anfrage QD-000184 – Laura Becker", body_de: "Schaufensterbeschriftung und 500 Flyer …", title_ar: "استفسار جديد QD-000184 – Laura Becker", body_ar: "Schaufensterbeschriftung und 500 Flyer …", link: `/inquiries/${id(1)}`, created_at: ago(14) },
  { id: 4, category: "shop", title_de: "Neue Shop-Bestellung SH-2026-0027 · 71,76 €", body_de: "Omar Khalil · Express", title_ar: "طلب جديد من المتجر SH-2026-0027 · 71,76 €", body_ar: "Omar Khalil · Express", link: `/shop/${id(31)}`, created_at: ago(25) },
  { id: 3, category: "datei", title_de: "Lindenblatt_Schaufenster_final.pdf → Druckfertig", body_de: "Kunden/Café Lindenblatt", title_ar: "Lindenblatt_Schaufenster_final.pdf ← جاهز للطباعة", body_ar: "Kunden/Café Lindenblatt", link: `/files/${id(21)}`, created_at: ago(40) },
  { id: 2, category: "dokument", title_de: "Angebot AN-2026-0098 angenommen ✓", body_de: "Wagner Bau GmbH", title_ar: "تم قبول العرض AN-2026-0098 ✓", body_ar: "Wagner Bau GmbH", link: null, created_at: ago(120) },
];

const counts = { alle: 4, aktiv: 4, neu: 1, bearbeitung: 3, erledigt: 0 };

/** Antworten der API im Vorschau-Modus */
export function demoApi(path: string): unknown {
  const p = path.split("?")[0];
  const one = (list: { id: string }[]) => list.find((x) => p.endsWith(x.id));
  if (p === "/me") return { user: { email: "inhaber@quickdesign24.de", name: "Ammar", role: "owner", full: true }, unread: 3 };
  if (p === "/dashboard")
    return {
      date: day(0),
      counts: { newInquiries: 2, openShop: 2, activeFiles: 4, myFiles: 1, todayTasks: 2 },
      today: projects.slice(0, 2).map((x) => ({ id: x.id, number: x.number, title: x.title, customer: x.company_name || x.customer_name, status: x.status, type: x.appointment_type, time: x.appointment_time?.slice(0, 5), city: x.site_city })),
      recentInquiries: inquiries.slice(0, 3),
      recentShop: shop,
      sales: { today: 7176, month: 184320 },
    };
  if (p === "/inquiries") return { items: inquiries };
  if (p.startsWith("/inquiries/")) return { item: one(inquiries) ?? inquiries[0], documents: [] };
  if (p === "/projects") return { items: projects };
  if (p.startsWith("/projects/"))
    return {
      item: one(projects) ?? projects[0],
      events: [
        { id: 2, type: "status", note: "→ In Arbeit", actor: "max@quickdesign24.de", created_at: ago(60) },
        { id: 1, type: "status", note: "→ Angenommen", actor: "inhaber@quickdesign24.de", created_at: ago(60 * 30) },
      ],
      files: files.filter((x) => x.project_id === p.split("/").pop()),
      items: [
        { description: "Schaufensterbeschriftung, Folie weiß, geplottet", quantity: "1 Psch." },
        { description: "Montage vor Ort inkl. Anfahrt", quantity: "3 Std." },
      ],
      finance: { invoiced: 645, paid: 645, open: 645 },
    };
  if (p === "/files") return { items: files, counts };
  if (p.startsWith("/files/"))
    return {
      item: one(files) ?? files[0],
      events: [{ id: 1, type: "status", note: "Druckfertig", actor: "Max", created_at: ago(30) }],
      team: [{ email: "inhaber@quickdesign24.de", name: "Ammar" }, { email: "max@quickdesign24.de", name: "Max" }, { email: "sami@quickdesign24.de", name: "Sami" }],
      url: null,
      preview: null,
    };
  if (p === "/shop") return { items: shop };
  if (p.startsWith("/shop/")) return { item: one(shop) ?? shop[0] };
  if (p === "/notifications") return { items: notifications, lastReadAt: ago(30) };
  if (p === "/customers") return { items: [] };
  if (p === "/documents") return { items: [] };
  return { ok: true };
}
