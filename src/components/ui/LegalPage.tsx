import type { ReactNode } from "react";
import PageHero from "@/components/ui/PageHero";

/** Simple, readable layout for legal texts. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PageHero label="Rechtliches" lines={[title]} />
      <section className="bg-paper py-20 sm:py-28">
        <div className="container-x">
          <div className="max-w-3xl space-y-10 text-lg leading-relaxed text-stone-dark [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-3 [&_h2]:font-[family-name:var(--font-display)] [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:text-ink [&_strong]:text-ink">
            {children}
          </div>
        </div>
      </section>
    </>
  );
}

/** Visually flags content that must be completed before going live. */
export function Placeholder({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-accent/15 px-1.5 py-0.5 text-ink">{children}</mark>;
}
