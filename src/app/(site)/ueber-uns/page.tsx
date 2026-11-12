import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import Parallax from "@/components/motion/Parallax";
import Reveal from "@/components/motion/Reveal";
import ScrollWords from "@/components/motion/ScrollWords";
import SplitText from "@/components/motion/SplitText";
import ContactCTA from "@/components/sections/ContactCTA";
import Approach from "@/components/sections/home/Approach";
import CropMarks from "@/components/ui/CropMarks";
import PageHero from "@/components/ui/PageHero";
import SectionLabel from "@/components/ui/SectionLabel";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { VALUES } from "@/content/values";

export const metadata: Metadata = {
  title: "Über uns",
  description:
    "QuickDesign verbindet kreative Gestaltung mit sauberer Produktion – Grafikdesign, Druck und Werbetechnik aus einer Hand.",
  alternates: { canonical: "/ueber-uns" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        label="Über uns"
        lines={["Wir sind", "QuickDesign."]}
        intro="Ein Partner für Gestaltung, Druck und Werbetechnik. Wir denken Ihre Werbung vom Entwurf bis zum fertigen Produkt – und achten dabei auf jedes Detail."
      />

      <section aria-label="Unsere Haltung" className="bg-paper py-24 sm:py-36">
        <div className="container-x grid gap-16 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Parallax offset={40}>
              <div className="relative rounded-[1.75rem] bg-paper-2 p-10 sm:p-16">
                <CropMarks className="[&>span]:border-ink/25" inset={14} />
                <Logo withTagline className="w-full text-ink" />
              </div>
            </Parallax>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <SectionLabel index="01" className="text-stone-dark">
              Haltung
            </SectionLabel>
            <ScrollWords
              className="mt-8 font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.4vw,3.2rem)] font-medium leading-[1.1] tracking-[-0.03em]"
              text={`„${site.tagline}“ ist für uns mehr als ein Slogan. Es bedeutet, dass Sie mit einer Idee zu uns kommen – und mit einem fertigen Ergebnis wieder gehen.`}
            />
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-stone-dark">
                Gestaltung und Produktion gehören bei uns zusammen. Deshalb entstehen Entwürfe, die sich sauber
                umsetzen lassen, und Produkte, die so aussehen, wie sie geplant waren.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-labelledby="values-title" className="grain relative bg-ink py-24 text-paper sm:py-36">
        <div className="container-x">
          <SectionLabel index="02" className="text-paper/55">
            Was uns ausmacht
          </SectionLabel>
          <SplitText id="values-title" lines={["Drei Prinzipien.", { text: "Jedes Projekt.", className: "text-paper/40" }]} className="display-md mt-8" />
          <div className="mt-16 grid gap-px overflow-hidden rounded-[1.75rem] bg-paper/10 md:grid-cols-3">
            {VALUES.map((value, i) => (
              <Reveal key={value.title} delay={i * 0.1} className="bg-ink p-8 sm:p-12">
                <span className="font-[family-name:var(--font-display)] text-7xl font-medium text-accent sm:text-8xl">{i + 1}</span>
                <h3 className="mt-10 font-[family-name:var(--font-display)] text-3xl font-medium">{value.title}</h3>
                <p className="mt-4 leading-relaxed text-paper/60">{value.text}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-24">
            <p className="eyebrow text-paper/45">{services.length} Disziplinen unter einem Dach</p>
            <ul className="mt-8 flex flex-wrap gap-3">
              {services.map((service, i) => (
                <li key={service.slug}>
                <Reveal delay={i * 0.04}>
                  <Link
                    href={`/leistungen/${service.slug}`}
                    className="inline-flex rounded-full px-5 py-3 font-[family-name:var(--font-display)] text-xl ring-1 ring-paper/15 transition-colors hover:bg-paper hover:text-ink sm:text-2xl"
                  >
                    {service.short}
                  </Link>
                </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Approach index="03" />
      <ContactCTA index="04" />
    </>
  );
}
