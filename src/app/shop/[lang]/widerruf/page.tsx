import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/lib/shop/config";
import { LegalShell } from "@/components/shop/LegalShell";
import { WiderrufText } from "@/components/shop/LegalTexts";

export const metadata: Metadata = { title: "Widerrufsbelehrung" };

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <LegalShell lang={lang} title="Widerrufsbelehrung" titleAr="حق الإرجاع (Widerruf)">
      <WiderrufText />
    </LegalShell>
  );
}
