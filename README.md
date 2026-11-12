# QuickDesign – Unternehmenswebsite

Offizielle Website von **QuickDesign** (Grafikdesign, Druck, Werbetechnik).
Online-Bestellungen von Druckprodukten laufen ausschließlich über die separate Plattform
**[QuickPrintly](https://quickprintly.de/)** – diese Website enthält bewusst keinen Shop.

## Stack

- Next.js 16 (App Router, alle Seiten statisch vorgerendert) · React 19 · TypeScript
- Tailwind CSS 4 – Designsystem in `src/app/globals.css` (`@theme`)
- [Motion](https://motion.dev) für Animationen, [Lenis](https://lenis.darkroom.engineering) für Smooth Scrolling
- Supabase (Postgres + Auth) für Verwaltung, Kunden, Angebote, Rechnungen und Marketing
- E-Mail-Versand per SMTP über das Postfach info@quickdesign24.de (inkl. PDF-Anhängen)
- PDF-Erzeugung mit @react-pdf/renderer (Vektor-Logo, Schriften lokal in `src/assets/pdf`)

## Entwicklung

```bash
npm install
npm run dev
```

```bash
npm run build && npm start
```

## Inhalte pflegen

Alle Texte und Daten liegen in `src/content/`:

| Datei | Inhalt |
|---|---|
| `site.ts` | Firmendaten, Kontakt, Navigation, QuickPrintly-Link, Social Media, Impressumsangaben |
| `services.ts` | Leistungen (erzeugt `/leistungen` und `/leistungen/[slug]`) |
| `projects.ts` | Portfolio – **derzeit nur Platzhalter** (siehe unten) |
| `process.ts`, `values.ts` | Arbeitsweise und Werte |

### Vor dem Livegang ausfüllen

1. **Impressum / Datenschutz:** `site.legal` in `src/content/site.ts` mit echten Angaben ersetzen und beide Seiten rechtlich prüfen lassen.
2. **Projekte:** In `src/content/projects.ts` echte Referenzen eintragen, Fotos unter `public/projekte/` ablegen, `image` setzen und `placeholder: false`. Platzhalter sind auf der Website sichtbar markiert.
3. **Social Media / WhatsApp:** Profil-URLs in `site.social` ergänzen; `site.whatsapp.enabled` nur aktivieren, wenn die Nummer per WhatsApp erreichbar ist.
4. **Akzentfarbe:** Das Logo ist schwarz-weiß; der Akzent (`--color-accent` in `globals.css`) kann bei Bedarf an eine Markenfarbe angepasst werden.

## Umgebungsvariablen (Vercel)

Nur für das Kontaktformular nötig – siehe `.env.example`:

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, optional `CONTACT_RECIPIENT`.

Ohne SMTP-Konfiguration zeigt das Formular einen Hinweis mit E-Mail-Adresse und Telefonnummer.

## Barrierefreiheit & Performance

- `prefers-reduced-motion` wird respektiert (Motion `reducedMotion="user"`, kein Lenis, keine Marquees/Parallax).
- Schriften werden über `next/font` lokal ausgeliefert, keine externen Bilder oder Tracker.
- Logo als SVG (`src/components/brand/logo-paths.ts`, automatisch aus `public/logo.png` vektorisiert).

## Migration vom alten Shop

Der frühere Online-Shop (Produktkonfiguratoren, Warenkorb, Checkout, Sendungsverfolgung, Admin-Bereich
mit Aufträgen, Kunden, Terminen, Zeiterfassung und Rechnungen sowie Prisma/Supabase) wurde aus diesem
Projekt entfernt. Der vollständige alte Code bleibt in der Git-Historie erhalten (Commit `dd70c2b` auf `main`).

- **Die Datenbank wurde nicht verändert.** Es wurden keine Migrationen und keine Löschungen ausgeführt.
- Vor einem eventuellen Löschen des Supabase-Projekts bitte ein Backup bzw. einen Datenexport anlegen.
- Nicht mehr benötigte Vercel-Variablen (`DATABASE_URL`, `ADMIN_*`, `CRON_SECRET`, `ORDER_DOCUMENT_SHARE_SECRET`, `APP_URL`) können entfernt werden, sobald die neue Version live ist; einen ggf. eingerichteten Cron-Job für `/api/cron/appointment-reminders` ebenfalls.
- Alte URLs werden umgeleitet: `/services/*` → `/leistungen`, `/cart` & `/checkout` → QuickPrintly, `/track` → `/kontakt`, `/admin/*` → `/`.


---

## Verwaltung (`/admin`)

| Bereich | Funktion |
|---|---|
| Übersicht | Umsatz (Monat/Jahr, 12-Monats-Diagramm), offene & überfällige Rechnungen, Angebote in Entscheidung, Annahmequote, neue Anfragen, Top-Kunden, meistgenutzte Leistungen, Aktivitäten |
| Anfragen | Kontaktformular-Eingänge (werden gespeichert + per E-Mail gemeldet), Status, Notizen, „Angebot erstellen“ mit einem Klick |
| Angebote | Editor mit Leistungskatalog, Favoriten-Schnellauswahl, **freie Positionen**, Netto-/Brutto-Eingabe je Position, 19/7/0 % USt., Rabatt; PDF; Versand per E-Mail (PDF-Anhang + Online-Link); Online-Annahme/-Ablehnung durch Kunden; Ansichts-Tracking; Duplizieren; **In Rechnung umwandeln** |
| Rechnungen | § 14 UStG-Pflichtangaben, lückenlose Nummern (RE-JJJJ-0001) erst beim Festschreiben, GoBD-Schreibschutz, Teil-/Zahlungen, Überfällig-Erkennung, Storno |
| Kunden | CRM mit Kundennummern, Schlagwörtern, Umsatz, Dokumenten, Anfragen, Einwilligungsverlauf, CSV-Export, DSGVO-Auskunft (Art. 15) & Löschung (Art. 17) |
| Marketing | Einwilligungen (Double-Opt-in), Herkunft der Anfragen (UTM), E-Mail-Kampagnen mit Abmeldelink & One-Click-Unsubscribe |
| Statistik | Eigene, cookielose Reichweitenmessung – nur nach Einwilligung |
| Leistungskatalog | Leistungen mit Netto-/Bruttopreis, Kategorien, Favoriten, Nutzungszähler |
| Einstellungen | Firmendaten, Steuer (inkl. § 19 UStG), Bank, Standardtexte, Benachrichtigungen, 2FA-Pflicht |
| Benutzer | Mitarbeiter einladen (Rollen Administrator/Mitarbeiter), sperren, löschen |
| Protokoll | Aktivitäten und E-Mail-Versand |

### Einrichtung

1. **Datenbank:** Migration `supabase/migrations/20261112100000_admin_crm.sql` ist im Supabase-Projekt **QuickDesign** bereits eingespielt.
2. **Vercel → Environment Variables** (siehe `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_EMAILS`, alle `SMTP_*`, `IP_HASH_SALT`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. **Supabase → Authentication → Sign In / Providers:** „Allow new users to sign up“ deaktivieren (zusätzlich blockiert ein Datenbank-Trigger fremde Registrierungen).
4. **Supabase → Authentication → URL Configuration:** Site URL `https://quickdesign24.de`.
5. **Erster Login (Inhaber):** `/admin/login` → „Passwort vergessen?“ → E-Mail aus `ADMIN_EMAILS` eingeben → Link in der E-Mail öffnen → Passwort festlegen. Danach unter „Sicherheit & 2FA“ die Zwei-Faktor-Anmeldung aktivieren.
6. **Einstellungen** in der Verwaltung ausfüllen: Steuernummer/USt-IdNr., Bankverbindung, Preise im Leistungskatalog.

### Datenschutz / Recht (Umsetzung)

- Cookie-Banner nach § 25 TDDDG: gleichwertige Schaltflächen, keine Vorauswahl, Kategorien Statistik & Marketing, Widerruf über „Cookie-Einstellungen“ im Footer.
- Statistik ohne Drittanbieter, ohne IP-Speicherung; Löschung nach 14 Monaten (täglicher Cron `/api/cron/cleanup`).
- E-Mail-Werbung nur mit ausdrücklicher, separater Einwilligung + Double-Opt-in (§ 7 UWG); Nachweis (Zeitpunkt, Quelle, Textversion, IP-Hash) in `consent_events`; Abmeldelink + `List-Unsubscribe` in jeder Kampagne.
- Datenschutzerklärung entsprechend erweitert. **Bitte vor dem Livegang rechtlich prüfen lassen.**
