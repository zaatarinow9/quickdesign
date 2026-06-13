import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-slate-950/50" />
        <img
          src="https://images.unsplash.com/photo-1598428254888-0604812a02ad?q=80&w=2070&auto=format&fit=crop"
          alt="Druckproduktion bei QuickDesign"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="public-container relative flex min-h-[calc(100vh-5rem)] items-center py-20 sm:min-h-[42rem] sm:py-24 lg:py-28">
        <div className="max-w-3xl text-white">
          <p className="text-sm font-medium leading-6 text-sky-100 sm:text-base">
            Druckstudio für Unternehmen, Teams und schnelle Produktionen
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl lg:text-7xl">
            Druckprodukte online konfigurieren, Dateien sauber übergeben und
            stressfrei bestellen.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
            QuickDesign verbindet Beratung, Druck und Bestellabwicklung in einem
            ruhigen Ablauf. Von der Idee bis zur Produktion behalten Sie Formate,
            Uploads und Preise klar im Blick.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
            >
              Leistungen entdecken
            </Link>
            <Link
              href="/track"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              Bestellung verfolgen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
