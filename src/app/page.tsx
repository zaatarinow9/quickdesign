import HeroSection from "@/components/home/HeroSection";
import ServicesSection from "@/components/home/ServicesSection";
import ProcessSection from "@/components/home/ProcessSection";

export default function Home() {
  return (
    <div className="w-full">
      <HeroSection />
      <ServicesSection />
      <ProcessSection />
    </div>
  );
}