import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "accent" | "ink" | "paper" | "outline-light" | "outline-dark";

const VARIANTS: Record<Variant, string> = {
  accent: "bg-accent text-ink",
  ink: "bg-ink text-paper",
  paper: "bg-paper text-ink",
  "outline-light": "border border-paper/25 bg-ink/40 text-paper backdrop-blur-md hover:border-paper/60",
  "outline-dark": "border border-ink/20 text-ink hover:border-ink/60",
};

/** Fill colour that sweeps in on hover, chosen to contrast each variant. */
const SWEEP: Record<Variant, string> = {
  accent: "bg-paper",
  ink: "bg-accent",
  paper: "bg-accent",
  "outline-light": "bg-paper",
  "outline-dark": "bg-ink",
};

const SWEEP_TEXT: Record<Variant, string> = {
  accent: "group-hover/btn:text-ink",
  ink: "group-hover/btn:text-ink",
  paper: "group-hover/btn:text-ink",
  "outline-light": "group-hover/btn:text-ink",
  "outline-dark": "group-hover/btn:text-paper",
};

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  external?: boolean;
  size?: "md" | "lg";
  className?: string;
};

/**
 * Pill button with a vertical colour sweep and an arrow that slides through
 * on hover. External links open in a new tab with a north-east arrow.
 */
export default function Button({ href, children, variant = "accent", external = false, size = "md", className }: ButtonProps) {
  const Icon = external ? ArrowUpRight : ArrowRight;
  const classes = cn(
    "group/btn relative isolate inline-flex items-center gap-3 overflow-hidden rounded-full font-medium transition-colors duration-500",
    size === "lg" ? "h-14 pl-7 pr-2 text-base" : "h-12 pl-6 pr-1.5 text-[0.95rem]",
    VARIANTS[variant],
    className,
  );

  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 translate-y-full rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-y-0",
          SWEEP[variant],
        )}
      />
      <span className={cn("transition-colors duration-500", SWEEP_TEXT[variant])}>{children}</span>
      <span
        aria-hidden
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-full",
          size === "lg" ? "h-10 w-10" : "h-9 w-9",
          variant === "accent" || variant === "paper" ? "bg-ink text-paper" : variant === "ink" ? "bg-paper text-ink" : "bg-current/10",
        )}
      >
        <Icon className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-6 group-hover/btn:-translate-y-0" />
        <Icon className="absolute h-4 w-4 -translate-x-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-0" />
      </span>
      {external ? <span className="sr-only">(öffnet in neuem Tab)</span> : null}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener" className={classes}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  );
}
