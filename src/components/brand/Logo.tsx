import { cn } from "@/lib/utils";
import { LOGO_CORE, LOGO_SEGMENTS, LOGO_TAGLINE, LOGO_WORDMARK } from "./logo-paths";

type LogoProps = {
  className?: string;
  /** Show the hand-lettered "Alles rund um Werbung" line. */
  withTagline?: boolean;
  title?: string;
};

/** Full horizontal logo (mark + wordmark). Inherits `currentColor`. */
export function Logo({ className, withTagline = false, title = "QuickDesign" }: LogoProps) {
  return (
    <svg
      viewBox={withTagline ? "58 146 1556 648" : "58 146 1556 648"}
      className={cn("block h-auto", className)}
      role="img"
      aria-label={title}
      fill="currentColor"
    >
      {LOGO_SEGMENTS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
      <path d={LOGO_CORE} fillRule="evenodd" />
      <path d={LOGO_WORDMARK} fillRule="evenodd" />
      {withTagline ? <path d={LOGO_TAGLINE} fillRule="evenodd" /> : null}
    </svg>
  );
}

/** Just the circular mark. */
export function LogoMark({ className, title = "QuickDesign" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="58 146 634 648"
      className={cn("block h-auto", className)}
      role="img"
      aria-label={title}
      fill="currentColor"
    >
      {LOGO_SEGMENTS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
      <path d={LOGO_CORE} fillRule="evenodd" />
    </svg>
  );
}
