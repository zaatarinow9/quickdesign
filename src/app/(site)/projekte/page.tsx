import type { Metadata } from "next";
import ContactCTA from "@/components/sections/ContactCTA";
import ProjectGrid from "@/components/sections/ProjectGrid";
import PageHero from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Projekte",
  description: "Ausgewählte Arbeiten von QuickDesign aus Grafikdesign, Druck, Werbetechnik, Fahrzeugbeschriftung und 3D-Buchstaben.",
  alternates: { canonical: "/projekte" },
};

export default function ProjectsPage() {
  return (
    <>
      <PageHero
        label="Projekte"
        lines={["Ausgewählte", "Arbeiten."]}
        intro="Ein Einblick in unsere Bereiche – vom Corporate Design bis zur Fassade. Weitere Referenzen zeigen wir Ihnen gern im persönlichen Gespräch."
      />
      <section aria-label="Projektübersicht" className="bg-paper pb-36 pt-16 sm:pt-24">
        <div className="container-x">
          <ProjectGrid />
        </div>
      </section>
      <ContactCTA index="01" />
    </>
  );
}
