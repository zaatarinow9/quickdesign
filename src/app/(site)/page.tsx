import AboutTeaser from "@/components/sections/home/AboutTeaser";
import Approach from "@/components/sections/home/Approach";
import CapabilityBand from "@/components/sections/home/CapabilityBand";
import Hero from "@/components/sections/home/Hero";
import SelectedWork from "@/components/sections/home/SelectedWork";
import ServicesIndex from "@/components/sections/home/ServicesIndex";
import ContactCTA from "@/components/sections/ContactCTA";
import FAQ from "@/components/sections/FAQ";
import FaqJsonLd from "@/components/sections/FaqJsonLd";
import ColorStory from "@/components/sections/home/ColorStory";
import PrintlyShowcase from "@/components/sections/PrintlyShowcase";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CapabilityBand />
      <ServicesIndex />
      <SelectedWork />
      <Approach />
      <ColorStory index="04" />
      <PrintlyShowcase index="05" />
      <AboutTeaser />
      <FAQ index="07" className="bg-paper-2" />
      <ContactCTA index="08" />
      <FaqJsonLd />
    </>
  );
}
