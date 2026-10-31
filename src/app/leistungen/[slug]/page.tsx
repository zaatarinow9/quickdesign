import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ServiceArt from "@/components/art/ServiceArt";
import Parallax from "@/components/motion/Parallax";
import Reveal from "@/components/motion/Reveal";
import SplitText from "@/components/motion/SplitText";
import ContactCTA from "@/components/sections/ContactCTA";
import Button from "@/components/ui/Button";
import CropMarks from "@/components/ui/CropMarks";
import SectionLabel from "@/components/ui/SectionLabel";
import { STEPS } from "@/content/process";
import { getService, services } from "@/content/services";
import { printly } from "@/content/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: service.title,
    description: `${service.claim} ${service.intro}`.slice(0, 160),
    alternates: { canonical: `/leistungen/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const index = services.findIndex((item) => item.slug === service.slug);
  const next = services[(index + 1) % services.length];

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink pb-20 pt-36 text-paper sm:pt-44">
        <div aria-hidden className="hairline-grid absolute inset-0 -z-10 text-paper/[0.04]" />
        <CropMarks className="[&>span]:border-paper/25" inset={20} />
        <div className="container-x grid items-end gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <nav aria-label="Brotkrumen" className="eyebrow text-paper/50">
              <Link href="/leistungen" className="hover:text-paper">
                Leistungen
              </Link>
              <span className="mx-3 text-accent">/</span>
              <span>
                {String(index + 1).padStart(2, "0")} von {String(services.length).padStart(2, "0")}
              </span>
            </nav>
            <SplitText as="h1" immediate delay={0.15} lines={[service.title]} className="display-lg mt-8" />
            <Reveal delay={0.4}>
              <p className="mt-8 font-[family-name:var(--font-display)] text-2xl text-accent sm:text-3xl">{service.claim}</p>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/65">{service.intro}</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button href="/kontakt" size="lg">
                  Angebot anfragen
                </Button>
                {service.availableOnline ? (
                  <Button href={printly.url} external variant="outline-light" size="lg">
                    {printly.cta}
                  </Button>
                ) : null}
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Parallax offset={30}>
              <Reveal delay={0.3} y={60}>
                <div className="group relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-ink-2 ring-1 ring-paper/10">
                  <div className="absolute inset-0 p-[10%]">
                    <ServiceArt variant={service.art} />
                  </div>
                </div>
              </Reveal>
            </Parallax>
          </div>
        </div>
      </section>

      <section aria-labelledby="capabilities-title" className="bg-paper py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionLabel index="01" className="text-stone-dark">
              Leistungsumfang
            </SectionLabel>
            <SplitText id="capabilities-title" lines={["Was wir für", "Sie umsetzen."]} className="display-md mt-8" />
          </div>
          <ul className="lg:col-span-7 lg:col-start-6">
            {service.capabilities.map((capability, i) => (
              <li key={capability} className="group border-t border-ink/10 last:border-b">
                <Reveal delay={i * 0.05} amount={0.5} className="flex items-baseline gap-6 py-6">
                  <span className="font-mono text-xs text-stone">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-[family-name:var(--font-display)] text-xl tracking-tight transition-transform duration-500 group-hover:translate-x-2 sm:text-3xl">
                    {capability}
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="usecases-title" className="bg-paper-2 py-24 sm:py-32">
        <div className="container-x">
          <SectionLabel index="02" className="text-stone-dark">
            Typische Einsätze
          </SectionLabel>
          <h2 id="usecases-title" className="sr-only">
            Typische Einsätze
          </h2>
          <div className="mt-10 flex flex-wrap gap-3 sm:gap-4">
            {service.useCases.map((useCase, i) => (
              <Reveal key={useCase} delay={i * 0.06}>
                <span className="inline-flex rounded-full bg-paper px-6 py-4 font-[family-name:var(--font-display)] text-2xl tracking-tight ring-1 ring-ink/10 sm:px-8 sm:text-4xl">
                  {useCase}
                </span>
              </Reveal>
            ))}
          </div>

          <div className="mt-24 grid gap-px overflow-hidden rounded-[1.75rem] bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08} className="bg-paper-2 p-8">
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-medium">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-dark">{step.text}</p>
              </Reveal>
            ))}
          </div>

          {service.availableOnline ? (
            <Reveal className="mt-10">
              <a
                href={printly.url}
                target="_blank"
                rel="noopener"
                className="group flex flex-col gap-6 rounded-[1.75rem] bg-ink p-8 text-paper sm:flex-row sm:items-center sm:justify-between sm:p-10"
              >
                <div>
                  <p className="eyebrow text-paper/50">{printly.name}</p>
                  <p className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
                    Standardprodukte direkt online bestellen – auf {printly.displayUrl}.
                  </p>
                </div>
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent text-ink transition-transform duration-700 group-hover:rotate-45">
                  <ArrowUpRight className="h-6 w-6" />
                </span>
                <span className="sr-only">(öffnet in neuem Tab)</span>
              </a>
            </Reveal>
          ) : null}
        </div>
      </section>

      <section aria-label="Nächste Leistung" className="bg-ink text-paper">
        <Link href={`/leistungen/${next.slug}`} className="group container-x flex items-center justify-between gap-8 py-16 sm:py-24">
          <span>
            <span className="eyebrow block text-paper/45">Nächste Leistung</span>
            <span className="mt-4 block font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,5.5rem)] font-medium leading-none tracking-[-0.04em] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-4">
              {next.title}
            </span>
          </span>
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-paper text-ink transition-all duration-700 group-hover:bg-accent sm:h-24 sm:w-24">
            <ArrowRight className="h-6 w-6 transition-transform duration-700 group-hover:translate-x-1" />
          </span>
        </Link>
      </section>

      <ContactCTA index="03" />
    </>
  );
}
