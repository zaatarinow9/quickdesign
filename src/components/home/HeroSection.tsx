import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative w-full h-[90vh] flex items-center justify-center overflow-hidden bg-neutral-950">
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1598428254888-0604812a02ad?q=80&w=2070&auto=format&fit=crop" 
          alt="Premium Printing" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="relative z-20 w-full px-6 md:px-12 flex flex-col items-center text-center">
        <span className="text-white/80 uppercase tracking-[0.3em] text-sm font-semibold mb-6">
          Premium Druckerei
        </span>
        <h1 className="text-5xl md:text-8xl font-bold text-white tracking-tighter mb-8 leading-tight max-w-5xl">
          Ihre Vision, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-500">
            Perfekt Gedruckt.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-300 mb-12 max-w-2xl leading-relaxed font-light">
          Hochwertige Drucklösungen für Unternehmen und Privatkunden. Exzellente Qualität, schnelle Lieferung und kompromissloser Service.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Link 
            href="/services" 
            className="flex items-center justify-center bg-white text-neutral-950 px-10 py-5 text-sm uppercase tracking-widest font-bold hover:bg-neutral-200 transition-all w-full sm:w-auto"
          >
            Leistungen Entdecken
          </Link>
          <Link 
            href="/track" 
            className="flex items-center justify-center bg-transparent border border-white/30 text-white px-10 py-5 text-sm uppercase tracking-widest font-bold hover:bg-white/10 transition-all w-full sm:w-auto backdrop-blur-sm"
          >
            Bestellung Verfolgen
          </Link>
        </div>
      </div>
    </section>
  );
}