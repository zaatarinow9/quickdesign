# QuickDesign – Unternehmenswebsite

Offizielle Website von **QuickDesign** (Grafikdesign, Druck, Werbetechnik).
Online-Bestellungen von Druckprodukten laufen ausschließlich über die separate Plattform
**[QuickPrintly](https://quickprintly.de/)** – diese Website enthält bewusst keinen Shop.

## Stack

- Next.js 16 (App Router, alle Seiten statisch vorgerendert) · React 19 · TypeScript
- Tailwind CSS 4 – Designsystem in `src/app/globals.css` (`@theme`)
- [Motion](https://motion.dev) für Animationen, [Lenis](https://lenis.darkroom.engineering) für Smooth Scrolling
- Kein Datenbank-Backend. Das Kontaktformular versendet E-Mails per SMTP (Server Action).

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
