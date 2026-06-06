"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="w-full border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-6 py-16 md:grid-cols-4 md:px-10">
        <div>
          <h3 className="mb-6 text-xl font-semibold tracking-tight text-slate-950">
            QuickDesign
          </h3>
          <p className="text-sm leading-7 text-slate-600">
            Ihre erste Adresse fuer professionellen Druck. Wir bieten hochwertige
            Druckdienstleistungen und Komplettloesungen fuer Ihre Anforderungen.
          </p>
        </div>
        <div>
          <h4 className="mb-6 text-sm font-semibold uppercase tracking-[0.16em] text-slate-900">
            Schnelllinks
          </h4>
          <ul className="space-y-4 text-sm text-slate-600">
            <li>
              <Link href="/services" className="transition-colors hover:text-slate-950">
                Leistungen
              </Link>
            </li>
            <li>
              <Link href="/portfolio" className="transition-colors hover:text-slate-950">
                Portfolio
              </Link>
            </li>
            <li>
              <Link href="/track" className="transition-colors hover:text-slate-950">
                Tracking
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-6 text-sm font-semibold uppercase tracking-[0.16em] text-slate-900">
            Leistungen
          </h4>
          <ul className="space-y-4 text-sm text-slate-600">
            <li>
              <Link
                href="/services/tshirts"
                className="transition-colors hover:text-slate-950"
              >
                T-Shirt Druck
              </Link>
            </li>
            <li>
              <Link
                href="/services/banners"
                className="transition-colors hover:text-slate-950"
              >
                Banner Druck
              </Link>
            </li>
            <li>
              <Link
                href="/services/cards"
                className="transition-colors hover:text-slate-950"
              >
                Visitenkarten
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-6 text-sm font-semibold uppercase tracking-[0.16em] text-slate-900">
            Kontakt
          </h4>
          <ul className="space-y-4 text-sm text-slate-600">
            <li>info@quickdesign24.de</li>
            <li>+49 1577 2785677</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-slate-500 md:flex-row md:px-10">
          <p>&copy; {new Date().getFullYear()} QuickDesign. Alle Rechte vorbehalten.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="transition-colors hover:text-slate-950">
              Datenschutz
            </Link>
            <Link href="/terms" className="transition-colors hover:text-slate-950">
              AGB
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
