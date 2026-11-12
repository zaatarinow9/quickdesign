import { requireFullAccess } from "@/lib/auth";
import { getSettings } from "@/lib/settings/server";
import { isSmtpConfigured } from "@/lib/env";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Notice, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  await requireFullAccess();
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Einstellungen" description="Firmendaten, Steuern, Bankverbindung, Standardtexte und Benachrichtigungen." />
      {!isSmtpConfigured() ? (
        <div className="mb-6">
          <Notice tone="warn">E-Mail-Versand ist nicht eingerichtet: Bitte die SMTP-Zugangsdaten für info@quickdesign24.de (SMTP_HOST, SMTP_USER, SMTP_PASS …) in Vercel hinterlegen.</Notice>
        </div>
      ) : null}
      {!settings.company.vatId && !settings.company.taxNumber ? (
        <div className="mb-6">
          <Notice tone="warn">Für gültige Rechnungen bitte Steuernummer oder USt-IdNr. eintragen.</Notice>
        </div>
      ) : null}
      <SettingsForm settings={settings} />
    </>
  );
}
