import type { Metadata } from "next";
import LegalPage from "@/components/ui/LegalPage";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Impressum",
  alternates: { canonical: "/impressum" },
};

export default function ImprintPage() {
  const { legal, contact } = site;
  return (
    <LegalPage title="Impressum">
      <div>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {legal.companyName}
          <br />
          Inhaber: {legal.owner}
          <br />
          {legal.street}
          <br />
          {legal.postalCode} {legal.city}
          <br />
          {legal.country}
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
      {legal.vatId ? (
        <div>
          <h2>Umsatzsteuer-ID</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {legal.vatId}</p>
        </div>
      ) : null}
      {legal.register ? (
        <div>
          <h2>Registereintrag</h2>
          <p>{legal.register}</p>
        </div>
      ) : null}
      <div>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          {legal.owner}
          <br />
          {legal.street}, {legal.postalCode} {legal.city}
        </p>
      </div>
      <div>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </div>
      <div>
        <h2>Haftung für Inhalte und Links</h2>
        <p>
          Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und
          Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Für die Inhalte verlinkter externer
          Seiten sind ausschließlich deren Betreiber verantwortlich.
        </p>
      </div>
    </LegalPage>
  );
}
