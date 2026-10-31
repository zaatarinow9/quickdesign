import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import ScrollWords from "@/components/motion/ScrollWords";
import SectionLabel from "@/components/ui/SectionLabel";
import { VALUES } from "@/content/values";

export default function AboutTeaser() {
  return (
    <section aria-label="Über QuickDesign" className="relative bg-paper py-24 sm:py-36">
      <div className="container-x">
        <SectionLabel index="06" className="text-stone-dark">
          Über uns
        </SectionLabel>
        <ScrollWords
          className="mt-10 max-w-6xl font-[family-name:var(--font-display)] text-[clamp(1.9rem,4.4vw,4.4rem)] font-medium leading-[1.08] tracking-[-0.03em]"
          text="Wir verbinden kreative Gestaltung mit sauberer Produktion – damit Ihre Marke auf Papier, Folie, Textil und an der Fassade genauso überzeugt wie auf dem Bildschirm."
        />

        <div className="mt-20 grid gap-px overflow-hidden rounded-[1.75rem] bg-ink/10 sm:mt-28 md:grid-cols-3">
          {VALUES.map((value, i) => (
            <Reveal key={value.title} delay={i * 0.1} className="group relative bg-paper p-8 sm:p-10">
              <span className="font-mono text-xs text-stone">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-10 font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight">{value.title}</h3>
              <p className="mt-4 leading-relaxed text-stone-dark">{value.text}</p>
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-1 w-full bg-brand-gradient origin-left scale-x-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
              />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12">
          <Link href="/ueber-uns" className="group inline-flex items-center gap-3 text-lg">
            <span className="link-underline">Mehr über uns</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
