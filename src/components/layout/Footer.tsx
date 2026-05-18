import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-neutral-950 text-neutral-200">
      <div className="w-full px-6 py-16 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <h3 className="text-xl font-bold tracking-tighter uppercase mb-6 text-white">QuickDesign</h3>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Ihre erste Adresse für professionellen Druck. Wir bieten hochwertige Druckdienstleistungen und Komplettlösungen für all Ihre Anforderungen.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-6">Schnelllinks</h4>
          <ul className="space-y-4 text-sm text-neutral-400">
            <li><Link href="/services" className="hover:text-white transition-colors">Leistungen</Link></li>
            <li><Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link></li>
            <li><Link href="/track" className="hover:text-white transition-colors">Tracking</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-6">Leistungen</h4>
          <ul className="space-y-4 text-sm text-neutral-400">
            <li><Link href="/services/tshirts" className="hover:text-white transition-colors">T-Shirt Druck</Link></li>
            <li><Link href="/services/banners" className="hover:text-white transition-colors">Banner Druck</Link></li>
            <li><Link href="/services/cards" className="hover:text-white transition-colors">Visitenkarten</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-6">Kontakt</h4>
          <ul className="space-y-4 text-sm text-neutral-400">
            <li>info@quickdesign24.de</li>
            <li>+49 1577 2785677</li>
          </ul>
        </div>
      </div>
      <div className="w-full border-t border-neutral-800 px-6 py-6 md:px-12 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-500">
        <p>© {new Date().getFullYear()} QuickDesign. Alle Rechte vorbehalten.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Link href="/privacy" className="hover:text-white transition-colors">Datenschutz</Link>
          <Link href="/terms" className="hover:text-white transition-colors">AGB</Link>
        </div>
      </div>
    </footer>
  );
}