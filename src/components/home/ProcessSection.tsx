import {
  MousePointerClick,
  Printer,
  Settings2,
  Truck,
} from "lucide-react";

const PROCESS_STEPS = [
  {
    icon: MousePointerClick,
    title: "Produkt waehlen",
    description:
      "Waehlen Sie die passende Leistung aus dem Katalog und starten Sie direkt im Konfigurator.",
  },
  {
    icon: Settings2,
    title: "Konfigurieren",
    description:
      "Format, Materialien, Veredelungen und Pflichtangaben bleiben in einem klaren Ablauf gebuendelt.",
  },
  {
    icon: Printer,
    title: "Produktion",
    description:
      "Unsere Druckvorbereitung uebernimmt Ihre Daten, prueft Uploads und begleitet die Fertigung.",
  },
  {
    icon: Truck,
    title: "Liefern",
    description:
      "Sie verfolgen den Auftrag digital und behalten den Status bis zur Auslieferung im Blick.",
  },
];

export default function ProcessSection() {
  return (
    <section className="border-t border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="public-container">
        <div className="max-w-2xl">
          <p className="section-eyebrow">Der Ablauf</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Von der Konfiguration bis zur Auslieferung bleibt jeder Schritt
            nachvollziehbar.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {PROCESS_STEPS.map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="surface-card p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
