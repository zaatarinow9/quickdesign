import { ArrowUpRight, Clock, Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";
import Reveal from "@/components/motion/Reveal";
import PageHero from "@/components/ui/PageHero";
import SectionLabel from "@/components/ui/SectionLabel";
import { printly, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Kontakt",
  description: `Sprechen Sie mit QuickDesign über Ihr Projekt: ${site.contact.email} · ${site.contact.phone}.`,
  alternates: { canonical: "/kontakt" },
};

export default function ContactPage() {
  const channels = [
    { icon: Mail, label: "E-Mail", value: site.contact.email, href: `mailto:${site.contact.email}` },
    { icon: Phone, label: "Telefon", value: site.contact.phone, href: site.contact.phoneHref },
    ...(site.whatsapp.enabled
      ? [{ icon: MessageCircle, label: "WhatsApp", value: "Nachricht schreiben", href: site.whatsapp.href }]
      : []),
  ];

  return (
    <>
      <PageHero
        label="Kontakt"
        lines={["Erzählen Sie uns", "von Ihrem Projekt."]}
        intro="Ob erste Idee oder konkreter Auftrag: Schreiben Sie uns, rufen Sie an oder nutzen Sie das Formular. Wir melden uns mit einer ehrlichen Einschätzung und einem passenden Angebot."
      />

      <section aria-label="Kontaktmöglichkeiten und Anfrageformular" className="bg-paper py-20 sm:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <SectionLabel index="01" className="text-stone-dark">
              Direkt erreichen
            </SectionLabel>
            <ul className="mt-8 space-y-3">
              {channels.map((channel, i) => (
                <li key={channel.label}>
                  <Reveal delay={i * 0.08}>
                    <a
                      href={channel.href}
                      {...(channel.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
                      className="group flex items-center gap-5 rounded-2xl bg-paper-2 p-5 transition-colors duration-500 hover:bg-ink hover:text-paper"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-paper text-ink transition-colors duration-500 group-hover:bg-accent">
                        <channel.icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="eyebrow block text-stone group-hover:text-paper/50">{channel.label}</span>
                        <span className="mt-1 block truncate text-lg">{channel.value}</span>
                      </span>
                    </a>
                  </Reveal>
                </li>
              ))}
              <li>
                <Reveal delay={0.24}>
                  <div className="flex items-center gap-5 rounded-2xl p-5 ring-1 ring-ink/10">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-paper-2">
                      <Clock className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="eyebrow block text-stone">Erreichbar</span>
                      <span className="mt-1 block text-lg">{site.contact.hours}</span>
                    </span>
                  </div>
                </Reveal>
              </li>
            </ul>

            <Reveal delay={0.3}>
              <a
                href={printly.url}
                target="_blank"
                rel="noopener"
                className="group mt-10 block overflow-hidden rounded-[1.5rem] bg-ink p-7 text-paper"
              >
                <span className="eyebrow text-paper/50">Nur Druckprodukte?</span>
                <span className="mt-3 flex items-end justify-between gap-6">
                  <span className="font-[family-name:var(--font-display)] text-2xl leading-tight">
                    Direkt online bestellen auf {printly.displayUrl}
                  </span>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-ink transition-transform duration-700 group-hover:rotate-45">
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </span>
                <span className="sr-only">(öffnet in neuem Tab)</span>
              </a>
            </Reveal>
          </aside>

          <div className="lg:col-span-7 lg:col-start-6">
            <SectionLabel index="02" className="text-stone-dark">
              Anfrage senden
            </SectionLabel>
            <Reveal delay={0.1} className="mt-8">
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
