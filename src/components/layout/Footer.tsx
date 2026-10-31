import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { services } from "@/content/services";
import { navigation, printly, site } from "@/content/site";

const SOCIAL_LABELS: Record<keyof typeof site.social, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

export default function Footer() {
  const socials = (Object.keys(site.social) as (keyof typeof site.social)[]).filter((key) => site.social[key]);
  const year = new Date().getFullYear();

  return (
    <footer className="grain relative isolate overflow-hidden bg-ink pb-20 text-paper md:pb-0">
      <div className="container-x pt-20 sm:pt-28">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Logo withTagline className="w-[220px] sm:w-[260px]" />
            <p className="mt-8 max-w-sm text-paper/60">
              Gestaltung, Druck und Werbetechnik aus einer Hand – für Unternehmen, die gesehen werden wollen.
            </p>
            <a
              href={printly.url}
              target="_blank"
              rel="noopener"
              className="group mt-10 inline-flex items-center gap-4 rounded-2xl bg-paper/[0.04] p-4 pr-6 ring-1 ring-paper/10 transition-colors hover:bg-paper/[0.08]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-paper">
                <ArrowUpRight className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45" />
              </span>
              <span>
                <span className="eyebrow block text-paper/50">{printly.name}</span>
                <span className="mt-1 block font-medium">{printly.cta}</span>
              </span>
              <span className="sr-only">(öffnet in neuem Tab)</span>
            </a>
          </div>

          <nav aria-label="Footer – Seiten" className="lg:col-span-2">
            <h2 className="eyebrow text-paper/40">Seiten</h2>
            <ul className="mt-6 space-y-3">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-underline text-paper/80 hover:text-paper">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer – Leistungen" className="lg:col-span-2">
            <h2 className="eyebrow text-paper/40">Leistungen</h2>
            <ul className="mt-6 space-y-3">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link href={`/leistungen/${service.slug}`} className="link-underline text-paper/80 hover:text-paper">
                    {service.short}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="eyebrow text-paper/40">Kontakt</h2>
            <ul className="mt-6 space-y-3 text-paper/80">
              <li>
                <a href={`mailto:${site.contact.email}`} className="link-underline hover:text-paper">
                  {site.contact.email}
                </a>
              </li>
              <li>
                <a href={site.contact.phoneHref} className="link-underline hover:text-paper">
                  {site.contact.phone}
                </a>
              </li>
              <li className="text-paper/50">{site.contact.hours}</li>
              <li className="pt-2 text-paper/50">
                {site.legal.street}
                <br />
                {site.legal.postalCode} {site.legal.city}
              </li>
            </ul>
            {socials.length > 0 ? (
              <ul className="mt-8 flex flex-wrap gap-2">
                {socials.map((key) => (
                  <li key={key}>
                    <a
                      href={site.social[key]}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 ring-paper/15 transition-colors hover:bg-paper hover:text-ink"
                    >
                      {SOCIAL_LABELS[key]}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-paper/10 py-6 text-sm text-paper/45 sm:flex-row sm:items-center sm:justify-between md:pr-20">
          <p>
            © {year} {site.name}. {site.tagline}.
          </p>
          <ul className="flex gap-6">
            <li>
              <Link href="/impressum" className="hover:text-paper">
                Impressum
              </Link>
            </li>
            <li>
              <Link href="/datenschutz" className="hover:text-paper">
                Datenschutz
              </Link>
            </li>
          </ul>
        </div>
      </div>

    </footer>
  );
}
