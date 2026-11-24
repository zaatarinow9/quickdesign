import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getLocales } from "expo-localization";
import { prefs } from "./storage";

export type Lang = "de" | "ar";

const de = {
  appName: "QuickDesign Team",
  tabs: { home: "Start", inquiries: "Anfragen", work: "Termine", files: "Dateien", more: "Mehr" },
  common: {
    loading: "Lädt …",
    retry: "Erneut versuchen",
    error: "Das hat nicht geklappt.",
    network: "Keine Verbindung zum Server.",
    save: "Speichern",
    saved: "Gespeichert",
    cancel: "Abbrechen",
    search: "Suchen",
    empty: "Nichts gefunden.",
    all: "Alle",
    open: "Offen",
    done: "Erledigt",
    call: "Anrufen",
    email: "E-Mail",
    whatsapp: "WhatsApp",
    navigate: "Navigation",
    notes: "Notizen",
    history: "Verlauf",
    status: "Status",
    changeStatus: "Status ändern",
    today: "Heute",
    by: "von",
    noAccess: "Kein Zugriff für dieses Konto.",
    seeAll: "Alle anzeigen",
    fresh: "Neu",
    details: "Details",
    contact: "Kontakt",
    actions: "Aktionen",
  },
  login: {
    title: "Willkommen zurück",
    subtitle: "Melde dich mit deinem QuickDesign-Konto an.",
    email: "E-Mail",
    password: "Passwort",
    submit: "Anmelden",
    wrong: "E-Mail oder Passwort ist falsch.",
    mfaTitle: "Bestätigungscode",
    mfaText: "Gib den 6-stelligen Code aus deiner Authenticator-App ein.",
    mfaWrong: "Der Code ist ungültig.",
    verify: "Bestätigen",
    enroll: "Für dein Konto ist die Zwei-Faktor-Anmeldung Pflicht. Richte sie bitte zuerst auf der Website unter /admin ein.",
    logout: "Abmelden",
  },
  home: {
    hello: "Hallo",
    newInquiries: "Neue Anfragen",
    openShop: "Offene Shop-Bestellungen",
    activeFiles: "Dateien in Arbeit",
    myFiles: "Mir zugewiesen",
    todayPlan: "Heute geplant",
    nothingToday: "Heute stehen keine Termine an.",
    recentInquiries: "Neueste Anfragen",
    recentShop: "Neueste Shop-Bestellungen",
    salesToday: "Shop heute",
    salesMonth: "Shop diesen Monat",
    notifications: "Benachrichtigungen",
  },
  inquiry: {
    title: "Anfragen",
    message: "Nachricht",
    interests: "Interessen",
    internal: "Interne Notiz",
    internalPlaceholder: "Nur für das Team sichtbar …",
    documents: "Angebote & Rechnungen",
    status: { neu: "Neu", in_bearbeitung: "In Bearbeitung", erledigt: "Erledigt", archiviert: "Archiviert" },
  },
  shop: {
    title: "Shop-Bestellungen",
    items: "Artikel",
    shipping: "Versand",
    address: "Lieferadresse",
    subtotal: "Zwischensumme",
    total: "Gesamt",
    test: "Testbestellung",
    status: { bezahlt: "Bezahlt", in_produktion: "In Produktion", versendet: "Versendet", abholbereit: "Abholbereit", abgeschlossen: "Abgeschlossen", storniert: "Storniert" },
  },
  project: {
    title: "Aufträge & Termine",
    orders: "Aufträge",
    tasks: "Termine",
    appointment: "Termin",
    site: "Einsatzort",
    contact: "Ansprechpartner",
    crew: "Hinweise für das Team",
    collect: "Bei Abschluss kassieren",
    positions: "Positionen",
    files: "Dateien",
    addNote: "Notiz hinzufügen",
    notePlaceholder: "Was ist passiert?",
    notifyCustomer: "Kunden per E-Mail informieren",
    mailSent: "Kunde wurde informiert.",
    finance: "Abrechnung",
    invoiced: "Berechnet",
    paid: "Bezahlt",
    openAmount: "Offen",
    status: { angenommen: "Angenommen", in_arbeit: "In Arbeit", fertig: "Fertig", abgeschlossen: "Abgeschlossen" },
    types: { montage: "Montage", lieferung: "Lieferung", abholung: "Abholung", besorgung: "Besorgung", sonstiges: "Sonstiges" },
    scope: { open: "Offen", done: "Abgeschlossen" },
  },
  appt: {
    title: "Termine",
    mine: "Meine",
    all: "Alle",
    new: "Neuer Termin",
    edit: "Termin bearbeiten",
    kind: "Art",
    who: "Mit wem?",
    customer: "Kunde aus der Kartei",
    freeName: "Ohne Kundenakte – nur Name",
    name: "Name der Person / Firma",
    phone: "Telefon (optional)",
    searchCustomer: "Kunden suchen …",
    when: "Wann?",
    from: "Beginn",
    until: "Ende",
    staff: "Wer ist dabei?",
    titleField: "Titel (optional)",
    agenda: "Worum geht es? / Was wird erledigt?",
    agendaPlaceholder: "Entwürfe zeigen, Maße aufnehmen, Preis besprechen …",
    location: "Ort",
    locationPlaceholder: "Im Laden, beim Kunden: Adresse, Telefon …",
    notes: "Interne Notiz",
    save: "Termin speichern",
    create: "Termin anlegen",
    created: "Termin angelegt",
    conflict: "Achtung: Überschneidung mit einem anderen Termin von",
    delete: "Termin löschen",
    deleteAsk: "Termin wirklich löschen?",
    orderBadge: "Auftrag",
    none: "Keine Termine in den nächsten zwei Wochen.",
    needWho: "Bitte einen Kunden wählen oder einen Namen eintragen.",
    kinds: { beratung: "Beratung", besprechung: "Besprechung", aufmass: "Aufmaß", montage: "Montage", abholung: "Abholung", lieferung: "Lieferung", fotoshooting: "Fotoshooting", sonstiges: "Sonstiges" },
    status: { geplant: "Geplant", bestaetigt: "Bestätigt", erledigt: "Erledigt", abgesagt: "Abgesagt" },
  },
  file: {
    title: "Dateien",
    mine: "Meine",
    upload: "Hochladen",
    uploadPhoto: "Foto aufnehmen",
    uploadLibrary: "Aus Fotos wählen",
    uploadDocument: "Datei wählen",
    uploading: "Wird hochgeladen …",
    uploaded: "Hochgeladen",
    open: "Datei öffnen",
    assign: "Zuweisen",
    assignedTo: "Zugewiesen an",
    nobody: "Niemand",
    folder: "Ordner",
    note: "Notiz",
    next: "Weiter",
    step: "Schritt {n} von {total}",
    status: { neu: "Neu", bearbeitung: "In Arbeit", erledigt: "Fertig" },
  },
  customer: { title: "Kunden", projects: "Aufträge", inquiries: "Anfragen", documents: "Dokumente", address: "Adresse", kind: { privat: "Privat", firma: "Firma" } },
  doc: {
    offers: "Angebote",
    invoices: "Rechnungen",
    pdf: "PDF öffnen",
    share: "Teilen",
    viewed: "Vom Kunden geöffnet",
    accepted: "Angenommen",
    validUntil: "Gültig bis",
    due: "Fällig",
    paidAmount: "Bezahlt",
    status: { entwurf: "Entwurf", offen: "Offen", versendet: "Versendet", angenommen: "Angenommen", abgelehnt: "Abgelehnt", bezahlt: "Bezahlt", teilbezahlt: "Teilweise bezahlt", ueberfaellig: "Überfällig", storniert: "Storniert", abgelaufen: "Abgelaufen" } as Record<string, string>,
  },
  more: {
    title: "Mehr",
    shop: "Shop-Bestellungen",
    customers: "Kunden",
    offers: "Angebote",
    invoices: "Rechnungen",
    notifications: "Benachrichtigungen",
    settings: "Einstellungen",
  },
  notif: { title: "Benachrichtigungen", markRead: "Alle gelesen", empty: "Noch keine Benachrichtigungen." },
  settings: {
    title: "Einstellungen",
    language: "Sprache",
    push: "Push-Benachrichtigungen",
    pushOff: "Benachrichtigungen sind auf diesem Gerät ausgeschaltet. Bitte in den iOS-Einstellungen erlauben.",
    enable: "Aktivieren",
    categories: { anfrage: "Neue Anfragen", shop: "Shop-Bestellungen", datei: "Dateien & Druck", projekt: "Aufträge & Termine", dokument: "Angebote & Rechnungen" } as Record<string, string>,
    account: "Konto",
    role: { owner: "Inhaber", admin: "Administrator", manager: "Mitarbeiter" } as Record<string, string>,
    version: "Version",
  },
};

export type Dict = typeof de;

const ar: Dict = {
  appName: "فريق QuickDesign",
  tabs: { home: "الرئيسية", inquiries: "الاستفسارات", work: "المواعيد", files: "الملفات", more: "المزيد" },
  common: {
    loading: "جارٍ التحميل…",
    retry: "إعادة المحاولة",
    error: "حدث خطأ.",
    network: "لا يوجد اتصال بالخادم.",
    save: "حفظ",
    saved: "تم الحفظ",
    cancel: "إلغاء",
    search: "بحث",
    empty: "لا توجد نتائج.",
    all: "الكل",
    open: "مفتوح",
    done: "منتهي",
    call: "اتصال",
    email: "بريد",
    whatsapp: "واتساب",
    navigate: "الملاحة",
    notes: "ملاحظات",
    history: "السجل",
    status: "الحالة",
    changeStatus: "تغيير الحالة",
    today: "اليوم",
    by: "بواسطة",
    noAccess: "هذا الحساب لا يملك صلاحية.",
    seeAll: "عرض الكل",
    fresh: "جديد",
    details: "التفاصيل",
    contact: "التواصل",
    actions: "الإجراءات",
  },
  login: {
    title: "أهلاً بعودتك",
    subtitle: "سجّل الدخول بحساب QuickDesign الخاص بك.",
    email: "البريد الإلكتروني",
    password: "كلمة السر",
    submit: "تسجيل الدخول",
    wrong: "البريد الإلكتروني أو كلمة السر غير صحيحة.",
    mfaTitle: "رمز التحقق",
    mfaText: "أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.",
    mfaWrong: "الرمز غير صحيح.",
    verify: "تأكيد",
    enroll: "التحقق بخطوتين إلزامي لحسابك. يرجى إعداده أولاً من الموقع عبر /admin.",
    logout: "تسجيل الخروج",
  },
  home: {
    hello: "مرحباً",
    newInquiries: "استفسارات جديدة",
    openShop: "طلبات متجر مفتوحة",
    activeFiles: "ملفات قيد العمل",
    myFiles: "مُسندة إليّ",
    todayPlan: "خطة اليوم",
    nothingToday: "لا توجد مواعيد اليوم.",
    recentInquiries: "أحدث الاستفسارات",
    recentShop: "أحدث طلبات المتجر",
    salesToday: "المتجر اليوم",
    salesMonth: "المتجر هذا الشهر",
    notifications: "الإشعارات",
  },
  inquiry: {
    title: "الاستفسارات",
    message: "الرسالة",
    interests: "الاهتمامات",
    internal: "ملاحظة داخلية",
    internalPlaceholder: "تظهر للفريق فقط…",
    documents: "العروض والفواتير",
    status: { neu: "جديد", in_bearbeitung: "قيد المعالجة", erledigt: "منتهي", archiviert: "مؤرشف" },
  },
  shop: {
    title: "طلبات المتجر",
    items: "المنتجات",
    shipping: "الشحن",
    address: "عنوان التوصيل",
    subtotal: "المجموع الفرعي",
    total: "المجموع",
    test: "طلب تجريبي",
    status: { bezahlt: "مدفوع", in_produktion: "قيد التنفيذ", versendet: "تم الشحن", abholbereit: "جاهز للاستلام", abgeschlossen: "مكتمل", storniert: "ملغى" },
  },
  project: {
    title: "الأعمال والمواعيد",
    orders: "طلبات العمل",
    tasks: "المواعيد",
    appointment: "الموعد",
    site: "مكان العمل",
    contact: "جهة التواصل",
    crew: "ملاحظات للفريق",
    collect: "المبلغ المطلوب تحصيله",
    positions: "البنود",
    files: "الملفات",
    addNote: "إضافة ملاحظة",
    notePlaceholder: "ماذا حدث؟",
    notifyCustomer: "إبلاغ الزبون بالبريد الإلكتروني",
    mailSent: "تم إبلاغ الزبون.",
    finance: "الحساب",
    invoiced: "مفوتر",
    paid: "مدفوع",
    openAmount: "متبقٍ",
    status: { angenommen: "مقبول", in_arbeit: "قيد التنفيذ", fertig: "جاهز", abgeschlossen: "مكتمل" },
    types: { montage: "تركيب", lieferung: "توصيل", abholung: "استلام", besorgung: "شراء مواد", sonstiges: "أخرى" },
    scope: { open: "مفتوحة", done: "مكتملة" },
  },
  appt: {
    title: "المواعيد",
    mine: "مواعيدي",
    all: "الكل",
    new: "موعد جديد",
    edit: "تعديل الموعد",
    kind: "النوع",
    who: "مع من؟",
    customer: "زبون من السجل",
    freeName: "بدون ملف زبون – الاسم فقط",
    name: "اسم الشخص / الشركة",
    phone: "الهاتف (اختياري)",
    searchCustomer: "ابحث عن زبون …",
    when: "متى؟",
    from: "البداية",
    until: "النهاية",
    staff: "من سيحضر؟",
    titleField: "العنوان (اختياري)",
    agenda: "عن ماذا الموعد؟ / ماذا سيُنجز؟",
    agendaPlaceholder: "عرض التصاميم، أخذ القياسات، مناقشة السعر …",
    location: "المكان",
    locationPlaceholder: "في المحل، عند الزبون: العنوان، هاتفياً …",
    notes: "ملاحظة داخلية",
    save: "حفظ الموعد",
    create: "إنشاء الموعد",
    created: "تم إنشاء الموعد",
    conflict: "تنبيه: يوجد تعارض مع موعد آخر لـ",
    delete: "حذف الموعد",
    deleteAsk: "هل تريد حذف الموعد فعلاً؟",
    orderBadge: "طلب عمل",
    none: "لا توجد مواعيد خلال الأسبوعين القادمين.",
    needWho: "اختر زبوناً أو اكتب اسماً.",
    kinds: { beratung: "استشارة", besprechung: "اجتماع", aufmass: "قياسات", montage: "تركيب", abholung: "استلام", lieferung: "توصيل", fotoshooting: "تصوير", sonstiges: "أخرى" },
    status: { geplant: "مخطط", bestaetigt: "مؤكد", erledigt: "تم", abgesagt: "ملغى" },
  },
  file: {
    title: "الملفات",
    mine: "ملفاتي",
    upload: "رفع",
    uploadPhoto: "التقاط صورة",
    uploadLibrary: "اختيار من الصور",
    uploadDocument: "اختيار ملف",
    uploading: "جارٍ الرفع…",
    uploaded: "تم الرفع",
    open: "فتح الملف",
    assign: "إسناد",
    assignedTo: "مُسند إلى",
    nobody: "لا أحد",
    folder: "المجلد",
    note: "ملاحظة",
    next: "التالي",
    step: "المرحلة {n} من {total}",
    status: { neu: "جديد", bearbeitung: "قيد العمل", erledigt: "منتهي" },
  },
  customer: { title: "الزبائن", projects: "الأعمال", inquiries: "الاستفسارات", documents: "المستندات", address: "العنوان", kind: { privat: "فرد", firma: "شركة" } },
  doc: {
    offers: "العروض",
    invoices: "الفواتير",
    pdf: "فتح PDF",
    share: "مشاركة",
    viewed: "فتحه الزبون",
    accepted: "مقبول",
    validUntil: "صالح حتى",
    due: "تاريخ الاستحقاق",
    paidAmount: "المدفوع",
    status: { entwurf: "مسودة", offen: "مفتوح", versendet: "مُرسل", angenommen: "مقبول", abgelehnt: "مرفوض", bezahlt: "مدفوع", teilbezahlt: "مدفوع جزئياً", ueberfaellig: "متأخر", storniert: "ملغى", abgelaufen: "منتهي الصلاحية" },
  },
  more: {
    title: "المزيد",
    shop: "طلبات المتجر",
    customers: "الزبائن",
    offers: "العروض",
    invoices: "الفواتير",
    notifications: "الإشعارات",
    settings: "الإعدادات",
  },
  notif: { title: "الإشعارات", markRead: "تعليم الكل كمقروء", empty: "لا توجد إشعارات بعد." },
  settings: {
    title: "الإعدادات",
    language: "اللغة",
    push: "الإشعارات الفورية",
    pushOff: "الإشعارات متوقفة على هذا الجهاز. يرجى السماح بها من إعدادات iOS.",
    enable: "تفعيل",
    categories: { anfrage: "الاستفسارات الجديدة", shop: "طلبات المتجر", datei: "الملفات والطباعة", projekt: "الأعمال والمواعيد", dokument: "العروض والفواتير" },
    account: "الحساب",
    role: { owner: "المالك", admin: "مدير", manager: "موظف" },
    version: "الإصدار",
  },
};

const dicts: Record<Lang, Dict> = { de, ar };

type Ctx = { lang: Lang; t: Dict; rtl: boolean; setLang: (l: Lang) => void; ready: boolean };
const LangCtx = createContext<Ctx>({ lang: "de", t: de, rtl: false, setLang: () => {}, ready: false });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (getLocales()[0]?.languageCode === "ar" ? "ar" : "de"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    prefs
      .get("lang")
      .then((v) => {
        if (v === "de" || v === "ar") setLangState(v);
      })
      .finally(() => setReady(true));
  }, []);
  const value = useMemo<Ctx>(
    () => ({
      lang,
      t: dicts[lang],
      rtl: lang === "ar",
      ready,
      setLang: (l) => {
        setLangState(l);
        void prefs.set("lang", l);
      },
    }),
    [lang, ready],
  );
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);

/** Zahlen/Datum je Sprache (arabisch mit westlichen Ziffern – wie in der Verwaltung) */
/** Intl-Aufrufe absichern: ein fehlendes Format darf die App nie abstürzen lassen */
function safeDate(loc: string, o: Intl.DateTimeFormatOptions, d: Date) {
  if (Number.isNaN(d.getTime())) return "–";
  try {
    return new Intl.DateTimeFormat(loc, o).format(d);
  } catch {
    try {
      const { timeZone: _tz, ...rest } = o;
      return new Intl.DateTimeFormat("de-DE", rest).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  }
}
function safeMoney(loc: string, v: number, o: Intl.NumberFormatOptions = {}) {
  const n = Number.isFinite(v) ? v : 0;
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency: "EUR", ...o }).format(n);
  } catch {
    return `${n.toFixed(2).replace(".", ",")} €`;
  }
}

export function fmt(lang: Lang) {
  const loc = lang === "ar" ? "ar-SY-u-nu-latn" : "de-DE";
  return {
    money: (euro: number) => safeMoney(loc, euro),
    cents: (c: number) => safeMoney(loc, c / 100),
    /** große Beträge ohne Cent (Kennzahlen) */
    centsShort: (c: number) => safeMoney(loc, c / 100, { maximumFractionDigits: c >= 100000 ? 0 : 2 }),
    date: (iso: string | null | undefined) => (iso ? safeDate(loc, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" }, new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)) : "–"),
    dateTime: (iso: string | null | undefined) =>
      iso ? safeDate(loc, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }, new Date(iso)) : "–",
    relative: (iso: string) => {
      // Hermes (iOS) kennt Intl.RelativeTimeFormat nicht – daher selbst formuliert
      const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
      const ar = lang === "ar";
      if (diff < 60) return ar ? "الآن" : "gerade eben";
      if (diff < 3600) {
        const n = Math.round(diff / 60);
        return ar ? `منذ ${n} د` : `vor ${n} Min.`;
      }
      if (diff < 86400) {
        const n = Math.round(diff / 3600);
        return ar ? `منذ ${n} س` : `vor ${n} Std.`;
      }
      if (diff < 86400 * 7) {
        const n = Math.round(diff / 86400);
        if (n === 1) return ar ? "أمس" : "gestern";
        return ar ? `منذ ${n} أيام` : `vor ${n} Tagen`;
      }
      return safeDate(loc, { day: "2-digit", month: "2-digit", year: "numeric" }, new Date(iso));
    },
    weekday: (iso: string) => safeDate(loc, { weekday: "long", day: "numeric", month: "long" }, new Date(`${iso}T12:00:00Z`)),
    bytes: (n: number) => (n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(0)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`),
  };
}
