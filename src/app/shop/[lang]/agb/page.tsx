import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/lib/shop/config";
import { getSettings } from "@/lib/settings/server";
import { getStore } from "@/lib/shop/store";
import { LegalShell } from "@/components/shop/LegalShell";
import { AgbText } from "@/components/shop/LegalTexts";

export const metadata: Metadata = { title: "Allgemeine Geschäftsbedingungen" };

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [settings, store] = await Promise.all([getSettings(), getStore()]);
  return (
    <LegalShell lang={lang} title="Allgemeine Geschäftsbedingungen" titleAr="الشروط العامة (AGB)">
      <AgbText smallBusiness={settings.tax.smallBusiness} s={store.settings} />
    </LegalShell>
  );
}
