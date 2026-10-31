import AboutTeaser from "@/components/sections/home/AboutTeaser";
import Approach from "@/components/sections/home/Approach";
import CapabilityBand from "@/components/sections/home/CapabilityBand";
import Hero from "@/components/sections/home/Hero";
import SelectedWork from "@/components/sections/home/SelectedWork";
import ServicesIndex from "@/components/sections/home/ServicesIndex";
import ContactCTA from "@/components/sections/ContactCTA";
import PrintlyShowcase from "@/components/sections/PrintlyShowcase";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CapabilityBand />
      <ServicesIndex />
      <SelectedWork />
      <Approach />
      <PrintlyShowcase />
      <AboutTeaser />
      <ContactCTA />
    </>
  );
}
