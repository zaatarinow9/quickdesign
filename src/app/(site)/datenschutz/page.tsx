import type { Metadata } from "next";
import LegalPage from "@/components/ui/LegalPage";
import { ConsentSettingsLink } from "@/components/consent/CookieConsent";
import { printly, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Datenschutz",
  alternates: { canonical: "/datenschutz" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Datenschutz­erklärung">
      <div>
        <h2>1. Verantwortlicher</h2>
        <p>
          {site.legal.companyName}, Inhaber {site.legal.owner}
          <br />
          {site.legal.street}, {site.legal.postalCode} {site.legal.city}
          <br />
          E-Mail: <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> · Telefon: {site.contact.phone}
        </p>
      </div>

      <div>
        <h2>2. Hosting und Datenbank</h2>
        <p>
          Diese Website wird bei Vercel Inc. gehostet. Beim Aufruf der Seiten verarbeitet der Hoster technisch notwendige
          Daten (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite, Browsertyp) in Server-Logfiles, um die Website sicher und
          stabil bereitzustellen (Art. 6 Abs. 1 lit. f DSGVO). Dabei kann eine Übermittlung in die USA erfolgen; Vercel ist
          nach dem EU-U.S. Data Privacy Framework zertifiziert, zusätzlich bestehen Standardvertragsklauseln.
        </p>
        <p>
          Anfragen, Kundendaten, Angebote und Rechnungen speichern wir in einer Datenbank des Anbieters Supabase Inc. mit
          Serverstandort in der Europäischen Union (Irland). Mit beiden Anbietern bestehen Verträge zur
          Auftragsverarbeitung (Art. 28 DSGVO).
        </p>
      </div>

      <div id="cookies">
        <h2>3. Cookies, Einwilligung und Statistik</h2>
        <p>
          Beim ersten Besuch fragen wir Sie in einem Hinweisfenster, ob Sie optionalen Funktionen zustimmen. Ohne Ihre
          Zustimmung werden ausschließlich technisch notwendige Speichertechniken genutzt (§ 25 Abs. 2 TDDDG): Ihre
          Auswahl selbst (Eintrag „qd-consent“ im lokalen Speicher Ihres Browsers, 12 Monate) sowie – nur für unsere
          Mitarbeiter – ein Sitzungs-Cookie für die Anmeldung im Verwaltungsbereich.
        </p>
        <p>
          <strong>Statistik (nur mit Einwilligung):</strong> Wir zählen mit eigener Technik, welche Seiten aufgerufen
          werden, von welcher Website bzw. Kampagne Besucher kommen und ob ein Mobil- oder Desktop-Gerät genutzt wird. Dazu
          wird eine zufällige Kennung („qd-vid“) im lokalen Speicher Ihres Browsers abgelegt, um wiederkehrende Besuche zu
          erkennen. Ihre IP-Adresse wird hierfür nicht gespeichert, es werden keine Daten an Dritte oder Werbenetzwerke
          weitergegeben. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG. Die Daten werden nach spätestens
          14 Monaten gelöscht.
        </p>
        <p>
          <strong>Marketing (nur mit Einwilligung):</strong> Wir merken uns für die Dauer Ihres Besuchs (Sitzungsspeicher
          „qd-attribution“), über welche Kampagne oder Website Sie zu uns gekommen sind (z. B. UTM-Parameter einer
          Anzeige), und ordnen diese Information Ihrer Anfrage zu, wenn Sie uns schreiben. So können wir den Erfolg
          unserer Werbung bewerten. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG.
        </p>
        <p>
          Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen oder ändern:{" "}
          <ConsentSettingsLink className="underline underline-offset-4" />. Bei einem Widerruf werden die zugehörigen
          Einträge in Ihrem Browser sofort entfernt. Schriftarten werden lokal von unserem Server ausgeliefert; es findet
          keine Verbindung zu Google-Servern statt.
        </p>
      </div>

      <div>
        <h2>4. Kontaktformular und Anfragen</h2>
        <p>
          Wenn Sie uns über das Kontaktformular, per E-Mail oder telefonisch kontaktieren, verarbeiten wir Ihre Angaben
          (Name, Kontaktdaten, Nachricht sowie optional Firma und Telefonnummer) zur Bearbeitung Ihrer Anfrage und zur
          Erstellung eines Angebots (Art. 6 Abs. 1 lit. b DSGVO). Die Anfrage wird in unserer Kundendatenbank gespeichert
          und uns per E-Mail gemeldet. Zum Schutz vor Missbrauch speichern wir einen nicht umkehrbaren Hash-Wert Ihrer
          IP-Adresse (Art. 6 Abs. 1 lit. f DSGVO). Anfragen, aus denen kein Auftrag entsteht, löschen wir spätestens drei
          Jahre nach dem letzten Kontakt.
        </p>
      </div>

      <div>
        <h2>5. Kundendaten, Angebote und Rechnungen</h2>
        <p>
          Zur Durchführung von Aufträgen verarbeiten wir Ihre Stamm- und Vertragsdaten (Name, Anschrift, Kontaktdaten,
          ggf. USt-IdNr., Leistungen und Preise) in unserer Kundenverwaltung (Art. 6 Abs. 1 lit. b und c DSGVO). Angebote
          und Rechnungen senden wir Ihnen per E-Mail als PDF und stellen sie über einen persönlichen, nicht erratbaren
          Link online bereit. Wenn Sie ein Angebot online annehmen, speichern wir Ihren Namen, den Zeitpunkt und einen
          Hash-Wert Ihrer IP-Adresse als Nachweis. Rechnungen und buchungsrelevante Unterlagen bewahren wir entsprechend
          den gesetzlichen Pflichten bis zu zehn Jahre auf (§ 147 AO, § 257 HGB).
        </p>
      </div>

      <div>
        <h2>6. E-Mail-Werbung und Newsletter</h2>
        <p>
          Informationen zu unseren Leistungen und Aktionen senden wir per E-Mail nur, wenn Sie ausdrücklich eingewilligt
          haben (Art. 6 Abs. 1 lit. a DSGVO, § 7 Abs. 2 UWG). Die Einwilligung ist freiwillig und unabhängig von Ihrer
          Anfrage. Wir nutzen das Double-Opt-in-Verfahren: Erst nach Klick auf den Link in unserer Bestätigungs-E-Mail
          werden Sie aufgenommen. Zum Nachweis protokollieren wir Zeitpunkt, Quelle, Wortlaut der Einwilligung und einen
          Hash-Wert Ihrer IP-Adresse.
        </p>
        <p>
          Sie können die Einwilligung jederzeit widerrufen – über den Abmeldelink in jeder E-Mail oder per Nachricht an{" "}
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>. Nach einem Widerruf erhalten Sie keine Werbung
          mehr; den Nachweis über Einwilligung und Widerruf bewahren wir bis zu drei Jahre auf (Art. 6 Abs. 1 lit. c, Art. 7
          Abs. 1 DSGVO). Dem Versand von Direktwerbung können Sie zudem jederzeit widersprechen (Art. 21 Abs. 2 DSGVO).
        </p>
      </div>

      <div>
        <h2>7. E-Mail-Versand</h2>
        <p>
          E-Mails (Bestätigungen, Angebote, Rechnungen, Newsletter) versenden wir über unser eigenes Postfach{" "}
          {site.contact.email} beim E-Mail-Anbieter unseres Unternehmens. Versandvorgänge werden zur Nachvollziehbarkeit
          protokolliert (Empfänger, Betreff, Zeitpunkt, Zustellstatus).
        </p>
      </div>

      <div>
        <h2>8. Externe Links</h2>
        <p>
          Unsere Website verlinkt auf unsere Online-Druckplattform {printly.name} ({printly.displayUrl}). Für die
          Datenverarbeitung dort gilt die Datenschutzerklärung von {printly.name}.
        </p>
      </div>

      <div>
        <h2>9. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der
          Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO) sowie das Recht, erteilte
          Einwilligungen jederzeit zu widerrufen (Art. 7 Abs. 3 DSGVO). Wenden Sie sich dazu formlos an{" "}
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>. Sie können sich außerdem bei einer
          Datenschutz-Aufsichtsbehörde beschweren, z. B. beim Unabhängigen Datenschutzzentrum Saarland.
        </p>
      </div>
    </LegalPage>
  );
}
