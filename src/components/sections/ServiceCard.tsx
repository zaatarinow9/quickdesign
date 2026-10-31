import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import ServiceArt from "@/components/art/ServiceArt";
import type { Service } from "@/content/services";

export default function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <Link
      href={`/leistungen/${service.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-ink/10 transition-shadow duration-700 hover:shadow-[0_40px_80px_-40px_rgba(11,11,12,0.45)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink text-paper">
        <div aria-hidden className="hairline-grid absolute inset-0 text-paper/[0.04]" />
        <div className="absolute inset-0 p-[10%] transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]">
          <ServiceArt variant={service.art} />
        </div>
        <span className="absolute left-5 top-5 font-mono text-xs text-paper/50">{String(index + 1).padStart(2, "0")}</span>
        {service.availableOnline ? (
          <span className="absolute right-5 top-5 rounded-full bg-paper/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-paper/75 ring-1 ring-paper/15">
            Auch online
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-7 sm:p-9">
        <div className="flex items-start justify-between gap-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight sm:text-3xl">{service.title}</h2>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/15 transition-all duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 text-stone-dark">{service.claim}</p>
        <ul className="mt-auto flex flex-wrap gap-2 pt-8">
          {service.capabilities.slice(0, 3).map((capability) => (
            <li key={capability} className="rounded-full bg-paper-2 px-3 py-1.5 text-xs text-stone-dark">
              {capability}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
