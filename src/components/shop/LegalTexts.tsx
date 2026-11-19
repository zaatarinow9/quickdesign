/**
 * Rechtstexte des Shops (deutsch, rechtlich maßgeblich).
 * TODO(Inhaber): Von einer Fachperson (Anwalt / Händlerbund / IT-Recht-Kanzlei) prüfen lassen.
 * TODO(Inhaber): Kleinunternehmer (§ 19 UStG) ja/nein – Preisangabe in § 4 entsprechend.
 */
import { site } from "@/content/site";
import type { ShopSettings } from "@/lib/shop/schema";
import { money } from "@/lib/shop/format";

const L = site.legal;
const company = `${L.companyName}, Inhaber ${L.owner}, ${L.street}, ${L.postalCode} ${L.city}`;

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-xl font-semibold text-[var(--ink)]">{children}</h2>;
}

export function AgbText({ smallBusiness, s }: { smallBusiness: boolean; s: ShopSettings }) {
  const shipping = s.shipping;
  return (
    <>
      <H>§ 1 Geltungsbereich</H>
      <p>Diese Allgemeinen Geschäftsbedingungen gelten für alle Bestellungen, die Verbraucher und Unternehmer über den Online-Shop unter shop.quickdesign24.de bei {company} (nachfolgend „wir“) aufgeben.</p>
      <H>§ 2 Vertragspartner</H>
      <p>
        Der Kaufvertrag kommt zustande mit {company}. E-Mail: {site.contact.email}, Telefon: {site.contact.phone}. Weitere Angaben finden Sie im{" "}
        <a href="https://quickdesign24.de/impressum" className="underline">Impressum</a>.
      </p>
      <H>§ 3 Vertragsschluss</H>
      <p>
        Die Darstellung der Produkte im Shop stellt kein rechtlich bindendes Angebot dar, sondern eine Aufforderung zur Bestellung. Sie legen Artikel in den Warenkorb und gelangen über
        „Zur Kasse“ zum Bezahlvorgang unseres Zahlungsdienstleisters Stripe. Dort geben Sie Ihre Kontakt-, Liefer- und Zahlungsdaten ein, wählen die Versandart und schließen den Vorgang mit
        dem Bezahl-Button ab. Damit geben Sie ein verbindliches Angebot zum Kauf ab. Der Vertrag kommt zustande, wenn wir Ihre Bestellung per E-Mail bestätigen bzw. die Zahlung
        erfolgreich abgeschlossen ist. Der Vertragstext wird von uns gespeichert und Ihnen mit der Bestellbestätigung zugesandt.
      </p>
      <H>§ 4 Preise und Versandkosten</H>
      <p>
        {smallBusiness
          ? "Alle Preise sind Endpreise. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen."
          : "Alle Preise sind Endpreise und enthalten die gesetzliche Umsatzsteuer."}{" "}
        Zusätzlich fallen Versandkosten von {money(shipping.standardCents)} innerhalb Deutschlands an
        {shipping.freeFromCents ? <>; ab einem Warenwert von {money(shipping.freeFromCents)} liefern wir versandkostenfrei</> : null}.
        {shipping.express.enabled ? <> Expressversand mit bevorzugter Produktion kostet {money(shipping.express.cents)} ({shipping.express.days} Werktage).</> : null}
        {shipping.pickup.enabled ? " Die Abholung in unserem Ladengeschäft in Saarbrücken ist kostenlos." : null}
      </p>
      <H>§ 5 Lieferung</H>
      <p>
        Wir liefern ausschließlich innerhalb Deutschlands. Da jedes Teil nach Ihrer Bestellung bedruckt wird, beträgt die Lieferzeit in der Regel {shipping.deliveryDays} Werktage nach
        Zahlungseingang. Bei Abholung benachrichtigen wir Sie, sobald die Ware bereitliegt.
      </p>
      <H>§ 6 Zahlung</H>
      <p>
        Die Zahlung erfolgt über Stripe (Stripe Payments Europe Ltd.). Je nach Verfügbarkeit stehen Kreditkarte, Apple Pay, Google Pay, PayPal und Klarna zur Verfügung. Die Zahlung ist
        mit Abschluss der Bestellung fällig.
      </p>
      <H>§ 7 Eigentumsvorbehalt</H>
      <p>Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p>
      <H>§ 8 Widerrufsrecht</H>
      <p>
        Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Einzelheiten finden Sie in unserer Widerrufsbelehrung. Ausgeschlossen ist das Widerrufsrecht bei Waren, die nach
        Kundenspezifikation angefertigt werden (z. B. Sammelbestellungen mit eigenem Text oder Logo).
      </p>
      <H>§ 9 Gewährleistung</H>
      <p>Es gelten die gesetzlichen Mängelhaftungsrechte. Bitte melden Sie offensichtliche Transportschäden möglichst umgehend, damit wir Ansprüche gegenüber dem Versanddienstleister geltend machen können.</p>
      <H>§ 10 Streitbeilegung</H>
      <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      <H>§ 11 Schlussbestimmungen</H>
      <p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht zwingende Verbraucherschutzvorschriften des Aufenthaltsstaates entzogen werden.</p>
    </>
  );
}

export function WiderrufText() {
  return (
    <>
      <H>Widerrufsrecht</H>
      <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>
      <p>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.</p>
      <p>
        Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({company}, E-Mail: {site.contact.email}, Telefon: {site.contact.phone}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post
        versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht
        vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
      </p>
      <H>Folgen des Widerrufs</H>
      <p>
        Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die
        sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn
        Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel,
        das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser
        Rückzahlung Entgelte berechnet. Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die
        Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.
      </p>
      <p>
        Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns
        ({L.street}, {L.postalCode} {L.city}) zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden. Sie tragen die
        unmittelbaren Kosten der Rücksendung der Waren. Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der
        Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.
      </p>
      <H>Ausschluss des Widerrufsrechts</H>
      <p>Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist (z. B. Sammelbestellungen mit eigenem Namen, Text oder Logo).</p>
      <H>Muster-Widerrufsformular</H>
      <div className="rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--line)]">
        <p>(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
        <p className="mt-3">An {company}, E-Mail: {site.contact.email}:</p>
        <p className="mt-3">
          Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*): …
          <br />Bestellt am (*) / erhalten am (*): …
          <br />Name des/der Verbraucher(s): …
          <br />Anschrift des/der Verbraucher(s): …
          <br />Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): …
          <br />Datum: …
        </p>
        <p className="mt-3 text-sm">(*) Unzutreffendes streichen.</p>
      </div>
    </>
  );
}

export function VersandText({ smallBusiness, s }: { smallBusiness: boolean; s: ShopSettings }) {
  const shipping = s.shipping;
  return (
    <>
      <H>Versandgebiet</H>
      <p>Wir liefern ausschließlich innerhalb Deutschlands.</p>
      <H>Versandkosten</H>
      <ul className="list-disc space-y-1 ps-5">
        <li>Versand innerhalb Deutschlands: {money(shipping.standardCents)}</li>
        {shipping.freeFromCents ? <li>Ab {money(shipping.freeFromCents)} Warenwert: versandkostenfrei</li> : null}
        {shipping.express.enabled ? <li>Express mit bevorzugter Produktion: {money(shipping.express.cents)} ({shipping.express.days} Werktage)</li> : null}
        {shipping.pickup.enabled ? <li>Abholung: kostenlos bei {shipping.pickup.address}</li> : null}
      </ul>
      <p className="mt-3">{smallBusiness ? "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." : "Alle Preise inkl. gesetzlicher Umsatzsteuer."}</p>
      <H>Lieferzeit</H>
      <p>
        Jedes Teil wird nach Ihrer Bestellung bedruckt. Die Lieferzeit beträgt in der Regel {shipping.deliveryDays} Werktage nach Zahlungseingang. Für eine Lieferung vor dem 8. Dezember
        bestellen Sie bitte bis zum {s.campaign.lastOrderDay.split("-").reverse().join(".")}.
      </p>
      <H>Zahlungsarten</H>
      <p>Die Zahlung erfolgt sicher über Stripe. Je nach Verfügbarkeit: Kredit-/Debitkarte, Apple Pay, Google Pay, PayPal und Klarna. Ihre Zahlungsdaten werden ausschließlich von Stripe verarbeitet.</p>
    </>
  );
}
