import { LogoMark } from "@/components/brand/Logo";
import Marquee from "@/components/motion/Marquee";

const WORDS = [
  "Grafikdesign",
  "Corporate Design",
  "Digitaldruck",
  "Schilder",
  "Fahrzeugbeschriftung",
  "3D-Buchstaben",
  "Leuchtwerbung",
  "Großformat",
  "Textildruck",
  "Aufkleber",
];

/** Two counter-running rows of capabilities between hero and services. */
export default function CapabilityBand() {
  return (
    <section aria-label="Unsere Kompetenzen im Überblick" className="relative overflow-hidden bg-ink py-10 text-paper sm:py-14">
      <Marquee
        duration={55}
        items={WORDS.map((word, i) => (
          <span key={word} className={i % 2 ? "text-outline text-paper/70" : ""}>
            {word}
          </span>
        ))}
        itemClassName="px-6 font-[family-name:var(--font-display)] text-[clamp(2.5rem,7vw,6.5rem)] font-medium leading-none tracking-[-0.04em] sm:px-10"
        separator={<LogoMark className="w-8 shrink-0 text-accent sm:w-12" title="" />}
      />
      <Marquee
        reverse
        duration={70}
        className="mt-4 sm:mt-6"
        items={WORDS.slice().reverse()}
        itemClassName="eyebrow px-5 text-paper/40"
        separator={<span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-paper/30" />}
      />
    </section>
  );
}
