import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/lib/shop/config";
import { getSettings } from "@/lib/settings/server";
import { LegalShell } from "@/components/shop/LegalShell";
import { VersandText } from "@/components/shop/LegalTexts";

export const metadata: Metadata = { title: "Versand & Zahlung" };

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const settings = await getSettings();
  return (
    <LegalShell lang={lang} title="Versand & Zahlung" titleAr="الشحن والدفع">
      <VersandText smallBusiness={settings.tax.smallBusiness} />
    </LegalShell>
  );
}
