import type { Metadata } from "next";
import LegalPage from "@/components/ui/LegalPage";
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
        <h2>2. Hosting</h2>
        <p>
          Diese Website wird bei Vercel Inc. gehostet. Beim Aufruf der Seiten verarbeitet der Hoster technisch
          notwendige Daten (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite, Browsertyp) in Server-Logfiles, um die
          Website sicher und stabil bereitzustellen (Art. 6 Abs. 1 lit. f DSGVO). Dabei kann eine Übermittlung in
          die USA erfolgen.
        </p>
      </div>
      <div>
        <h2>3. Cookies, Tracking und Schriftarten</h2>
        <p>
          Diese Website setzt keine Tracking- oder Marketing-Cookies und verwendet keine Analyse-Dienste.
          Schriftarten werden lokal von unserem Server ausgeliefert; es findet keine Verbindung zu Google-Servern
          statt.
        </p>
      </div>
      <div>
        <h2>4. Kontaktformular und Anfragen per E-Mail oder Telefon</h2>
        <p>
          Wenn Sie uns über das Kontaktformular, per E-Mail oder telefonisch kontaktieren, verarbeiten wir Ihre
          Angaben (Name, Kontaktdaten, Nachricht sowie optional Firma und Telefonnummer) ausschließlich zur
          Bearbeitung Ihrer Anfrage (Art. 6 Abs. 1 lit. b und f DSGVO). Die Formulardaten werden per E-Mail an uns
          übermittelt und nicht in einer Datenbank gespeichert. Wir löschen die Daten, sobald sie für die
          Bearbeitung nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>
      </div>
      <div>
        <h2>5. Externe Links</h2>
        <p>
          Unsere Website verlinkt auf unsere Online-Druckplattform {printly.name} ({printly.displayUrl}). Für die
          Datenverarbeitung dort gilt die Datenschutzerklärung von {printly.name}.
        </p>
      </div>
      <div>
        <h2>6. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch sowie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu
          beschweren.
        </p>
      </div>
    </LegalPage>
  );
}
