# QuickDesign Team (Mitarbeiter-App)

Interne iOS/Android-App für das QuickDesign-Team: Anfragen, Aufträge & Termine, Dateien/Druck,
Shop-Bestellungen, Kunden, Angebote & Rechnungen – mit Sofort-Benachrichtigungen.

- Daten kommen ausschließlich über die geschützte API der Website (`/api/app/*`).
- Anmeldung mit dem Verwaltungs-Konto (Supabase) inkl. Zwei-Faktor-Code.
- Push: Gerät meldet sich unter `/api/app/devices` an; die Datenbank verschickt Hinweise
  selbst über Expo (Tabellen `staff_devices`, `staff_notifications`).
- Kein Schlüssel im Code: öffentliche Startwerte liefert `/api/app/config`.

```bash
npm install
npx tsc --noEmit && npx eslint src
npx eas-cli build --platform ios --profile production   # Build in der Expo-Cloud
```
