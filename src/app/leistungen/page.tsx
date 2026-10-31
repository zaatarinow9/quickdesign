import type { Metadata } from "next";
import Reveal from "@/components/motion/Reveal";
import ContactCTA from "@/components/sections/ContactCTA";
import PrintlyShowcase from "@/components/sections/PrintlyShowcase";
import ServiceCard from "@/components/sections/ServiceCard";
import PageHero from "@/components/ui/PageHero";
import { services } from "@/content/services";

export const metadata: Metadata = {
  title: "Leistungen",
  description:
    "Grafikdesign, Druck, Werbetechnik, Schilder, Fahrzeugbeschriftung, 3D-Buchstaben, Großformat- und Textildruck – alle Leistungen von QuickDesign im Überblick.",
  alternates: { canonical: "/leistungen" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        label="Leistungen"
        lines={["Gestaltung und", "Produktion, die", "zusammenpassen."]}
        intro="Acht Disziplinen, ein Anspruch: Werbung, die im echten Leben funktioniert. Wählen Sie einen Bereich – oder sprechen Sie uns direkt auf Ihr Vorhaben an."
      />
      <section aria-label="Alle Leistungen" className="bg-paper-2 py-20 sm:py-28">
        <div className="container-x grid gap-6 sm:grid-cols-2 sm:gap-8 xl:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.slug} delay={(i % 3) * 0.08} className="h-full">
              <ServiceCard service={service} index={i} />
            </Reveal>
          ))}
        </div>
      </section>
      <PrintlyShowcase index="01" />
      <ContactCTA index="02" />
    </>
  );
}
