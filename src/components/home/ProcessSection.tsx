import { MousePointerClick, Settings2, Printer, Truck } from "lucide-react";

const PROCESS_STEPS = [
  {
    icon: MousePointerClick,
    title: "Produkt Wählen",
    description: "Wählen Sie aus unserem breiten Sortiment an hochwertigen Druckprodukten."
  },
  {
    icon: Settings2,
    title: "Konfigurieren",
    description: "Passen Sie Format, Material und Veredelungen an Ihre Bedürfnisse an."
  },
  {
    icon: Printer,
    title: "Produktion",
    description: "Wir drucken mit modernster Technologie für höchste Präzision."
  },
  {
    icon: Truck,
    title: "Schnelle Lieferung",
    description: "Sichere und pünktliche Zustellung direkt an Ihre Wunschadresse."
  }
];

export default function ProcessSection() {
  return (
    <section className="w-full bg-neutral-50 py-32 px-6 md:px-12 border-t border-neutral-200">
      <div className="w-full text-center mb-24">
        <span className="text-neutral-500 uppercase tracking-widest text-xs font-bold mb-4 block">
          Der Ablauf
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-neutral-950 tracking-tighter">
          Von der Idee zum fertigen Produkt
        </h2>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-12 relative">
        <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-[1px] bg-neutral-300 z-0"></div>
        
        {PROCESS_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border border-neutral-200 shadow-sm rounded-none flex items-center justify-center mb-8">
                <Icon className="w-8 h-8 text-neutral-950" />
              </div>
              <h3 className="text-xl font-bold text-neutral-950 mb-4">{step.title}</h3>
              <p className="text-neutral-500 text-sm leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}