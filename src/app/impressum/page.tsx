import type { Metadata } from "next";
import LegalPage, { Placeholder } from "@/components/ui/LegalPage";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Impressum",
  alternates: { canonical: "/impressum" },
  robots: { index: true, follow: true },
};

export default function ImprintPage() {
  const { legal, contact } = site;
  return (
    <LegalPage title="Impressum">
      <p className="rounded-2xl bg-accent/10 p-5 text-base text-ink">
        Hinweis: Markierte Angaben sind Platzhalter und müssen vor der Veröffentlichung durch die vollständigen,
        rechtlich geprüften Unternehmensangaben ersetzt werden.
      </p>
      <div>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          <Placeholder>{legal.companyName}</Placeholder>
          <br />
          <Placeholder>{legal.street}</Placeholder>
          <br />
          <Placeholder>{legal.city}</Placeholder>
          <br />
          {legal.country}
        </p>
      </div>
      <div>
        <h2>Vertreten durch</h2>
        <p>
          <Placeholder>{legal.owner}</Placeholder>
        </p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <p>
          Telefon: <a href={contact.phoneHref}>{contact.phone}</a>
          <br />
          E-Mail: <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
      </div>
      <div>
        <h2>Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <Placeholder>{legal.vatId}</Placeholder>
        </p>
      </div>
      <div>
        <h2>Registereintrag</h2>
        <p>
          <Placeholder>{legal.register}</Placeholder>
        </p>
      </div>
      <div>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen. <Placeholder>[Bitte rechtlich prüfen]</Placeholder>
        </p>
      </div>
    </LegalPage>
  );
}
