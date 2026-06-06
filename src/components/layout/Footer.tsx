"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoMark from "@/components/layout/LogoMark";

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-white">
      <div className="public-container py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <div className="space-y-5">
            <LogoMark href="/" size="compact" />
            <p className="max-w-md text-sm leading-7 text-slate-600">
              QuickDesign begleitet Druckprojekte von der Konfiguration bis zur
              Bestellung mit klaren Ablaeufen, sauberen Uploads und persoenlicher
              Betreuung.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">Schnellzugriff</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>
                <Link href="/" className="transition-colors hover:text-slate-950">
                  Startseite
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="transition-colors hover:text-slate-950"
                >
                  Leistungen
                </Link>
              </li>
              <li>
                <Link href="/track" className="transition-colors hover:text-slate-950">
                  Bestellung verfolgen
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">Bestellung</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>
                <Link href="/cart" className="transition-colors hover:text-slate-950">
                  Warenkorb
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="transition-colors hover:text-slate-950"
                >
                  Checkout
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/login"
                  className="transition-colors hover:text-slate-950"
                >
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">Kontakt</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>info@quickdesign24.de</li>
              <li>+49 1577 2785677</li>
              <li>Mo bis Fr, 09:00 bis 18:00</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="public-container flex flex-col gap-3 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} QuickDesign. Alle Rechte vorbehalten.</p>
          <p>Klarere Konfigurationen, sauberere Dateien und entspannter Checkout.</p>
        </div>
      </div>
    </footer>
  );
}
