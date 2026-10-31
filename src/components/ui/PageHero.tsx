import SplitText from "@/components/motion/SplitText";
import Reveal from "@/components/motion/Reveal";
import CropMarks from "@/components/ui/CropMarks";
import SectionLabel from "@/components/ui/SectionLabel";

/** Dark intro header shared by all sub-pages. */
export default function PageHero({ label, lines, intro }: { label: string; lines: string[]; intro?: string }) {
  return (
    <section className="grain relative isolate overflow-hidden bg-ink pb-16 pt-36 text-paper sm:pb-24 sm:pt-44">
      <div aria-hidden className="hairline-grid absolute inset-0 -z-10 text-paper/[0.04]" />
      <CropMarks className="border-paper/30 text-paper/30 [&>span]:border-paper/30" inset={20} />
      <div className="container-x">
        <SectionLabel className="text-paper/60">{label}</SectionLabel>
        <SplitText as="h1" lines={lines} immediate delay={0.15} className="display-lg mt-8 max-w-6xl" />
        {intro ? (
          <Reveal delay={0.5} className="mt-10 max-w-2xl text-lg leading-relaxed text-paper/65 sm:text-xl">
            <p>{intro}</p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
