import { z } from "zod";
import { site } from "@/content/site";

/** Alle in der Verwaltung pflegbaren Einstellungen (eine Zeile `settings.app`). */
export const settingsSchema = z.object({
  company: z.object({
    name: z.string().trim().max(120).default(site.legal.companyName),
    owner: z.string().trim().max(120).default(site.legal.owner),
    street: z.string().trim().max(160).default(site.legal.street),
    postalCode: z.string().trim().max(12).default(site.legal.postalCode),
    city: z.string().trim().max(80).default(site.legal.city),
    country: z.string().trim().max(60).default("Deutschland"),
    phone: z.string().trim().max(60).default(site.contact.phone),
    email: z.string().trim().max(254).default(site.contact.email),
    website: z.string().trim().max(120).default("www.quickdesign24.de"),
    vatId: z.string().trim().max(40).default(site.legal.vatId),
    taxNumber: z.string().trim().max(40).default(""),
    register: z.string().trim().max(120).default(site.legal.register),
  }).prefault({}),
  bank: z.object({
    holder: z.string().trim().max(120).default(""),
    bankName: z.string().trim().max(120).default(""),
    iban: z.string().trim().max(40).default(""),
    bic: z.string().trim().max(20).default(""),
  }).prefault({}),
  tax: z.object({
    /** Kleinunternehmerregelung § 19 UStG: keine Umsatzsteuer ausweisen */
    smallBusiness: z.boolean().default(false),
    defaultVatRate: z.union([z.literal(19), z.literal(7), z.literal(0)]).default(19),
  }).prefault({}),
  offers: z.object({
    validityDays: z.number().int().min(1).max(365).default(30),
    intro: z.string().max(4000).default("vielen Dank für Ihre Anfrage und Ihr Interesse an QuickDesign. Gerne unterbreiten wir Ihnen folgendes Angebot:"),
    notes: z.string().max(4000).default("Alle Preise verstehen sich zzgl. der gesetzlichen Umsatzsteuer, sofern nicht anders angegeben. Druckfreigabe und Korrekturschleifen wie beschrieben; Mehraufwand nach vorheriger Absprache."),
    paymentTerms: z.string().max(1500).default("50 % Anzahlung bei Auftragserteilung, Restzahlung nach Fertigstellung innerhalb von 7 Tagen ohne Abzug."),
    closing: z.string().max(1500).default("Wir freuen uns auf Ihren Auftrag und stehen Ihnen für Rückfragen jederzeit gerne zur Verfügung."),
  }).prefault({}),
  invoices: z.object({
    dueDays: z.number().int().min(0).max(120).default(14),
    intro: z.string().max(4000).default("vielen Dank für Ihren Auftrag. Für unsere Leistungen erlauben wir uns, Ihnen Folgendes in Rechnung zu stellen:"),
    notes: z.string().max(4000).default(""),
    paymentTerms: z.string().max(1500).default("Bitte überweisen Sie den Rechnungsbetrag ohne Abzug bis zum angegebenen Fälligkeitsdatum unter Angabe der Rechnungsnummer."),
    closing: z.string().max(1500).default("Vielen Dank für die angenehme Zusammenarbeit."),
  }).prefault({}),
  notifications: z.object({
    inbox: z.string().trim().max(254).default(site.contact.email),
    notifyOnInquiry: z.boolean().default(true),
    notifyOnAcceptance: z.boolean().default(true),
  }).prefault({}),
  security: z.object({
    require2fa: z.boolean().default(false),
  }).prefault({}),
});

export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings = (): Settings => settingsSchema.parse({});
