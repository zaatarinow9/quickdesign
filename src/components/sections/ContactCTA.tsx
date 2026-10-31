import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Magnetic from "@/components/motion/Magnetic";
import Reveal from "@/components/motion/Reveal";
import SplitText from "@/components/motion/SplitText";
import SectionLabel from "@/components/ui/SectionLabel";
import { site } from "@/content/site";

/** Closing call to action used at the end of most pages. */
export default function ContactCTA({ index = "06" }: { index?: string }) {
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden bg-paper py-24 sm:py-36">
      <div className="container-x">
        <SectionLabel index={index} className="text-stone-dark">
          Kontakt
        </SectionLabel>
        <div className="mt-10 flex flex-col gap-14 lg:flex-row lg:items-end lg:justify-between">
          <SplitText
            id="cta-title"
            lines={["Lassen Sie uns", { text: "etwas Sichtbares", className: "text-stone" }, "schaffen."]}
            className="display-lg max-w-[14ch]"
          />
          <Reveal delay={0.2} className="shrink-0">
            <Magnetic strength={0.4}>
              <Link
                href="/kontakt"
                className="group relative grid h-44 w-44 place-items-center overflow-hidden rounded-full bg-ink text-paper sm:h-56 sm:w-56"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 scale-0 rounded-full bg-accent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100"
                />
                <span className="relative flex flex-col items-center gap-2 text-center transition-colors duration-500 group-hover:text-ink">
                  <ArrowUpRight className="h-7 w-7 transition-transform duration-700 group-hover:rotate-45" />
                  <span className="font-[family-name:var(--font-display)] text-xl font-medium">Projekt anfragen</span>
                </span>
              </Link>
            </Magnetic>
          </Reveal>
        </div>

        <Reveal className="mt-20 grid gap-6 border-t border-ink/10 pt-10 sm:grid-cols-3">
          <div>
            <p className="eyebrow text-stone">E-Mail</p>
            <a href={`mailto:${site.contact.email}`} className="link-underline mt-3 inline-block text-xl sm:text-2xl">
              {site.contact.email}
            </a>
          </div>
          <div>
            <p className="eyebrow text-stone">Telefon</p>
            <a href={site.contact.phoneHref} className="link-underline mt-3 inline-block text-xl sm:text-2xl">
              {site.contact.phone}
            </a>
          </div>
          <div>
            <p className="eyebrow text-stone">Erreichbar</p>
            <p className="mt-3 text-xl sm:text-2xl">{site.contact.hours}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
