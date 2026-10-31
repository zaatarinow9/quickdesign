import { cn } from "@/lib/utils";
import { BRAND_COLORS, LOGO_ARCS, LOGO_CORE, LOGO_SEGMENTS, LOGO_TAGLINE, LOGO_WORDMARK } from "./logo-paths";

/** Bounding boxes in the official logo's coordinate system. */
export const LOGO_VIEWBOX = "24 594 1940 812";
/** Square box centred on the circular mark (centre ≈ 421 / 1000) so rotations pivot correctly. */
export const MARK_VIEWBOX = "11 590 820 820";

type LogoProps = {
  className?: string;
  /** Show the hand-lettered "Alles rund um Werbung" line. */
  withTagline?: boolean;
  /** Render everything in `currentColor` (e.g. tiny icons). */
  mono?: boolean;
  title?: string;
};

/**
 * Official QuickDesign logo. Dark parts inherit `currentColor`, so the logo
 * works on both paper (ink) and ink (paper) backgrounds; the ring segments
 * keep their brand colours.
 */
export function Logo({ className, withTagline = false, mono = false, title = "QuickDesign" }: LogoProps) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={cn("block h-auto", className)} role="img" aria-label={title} fill="currentColor">
      {LOGO_SEGMENTS.map((segment) => (
        <path key={segment.d.slice(0, 24)} d={segment.d} fill={mono ? undefined : BRAND_COLORS[segment.color]} />
      ))}
      {LOGO_ARCS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
      <path d={LOGO_CORE} />
      {LOGO_WORDMARK.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
      {withTagline
        ? LOGO_TAGLINE.map((d) => <path key={d.slice(0, 24)} d={d} fill={mono ? undefined : BRAND_COLORS.magenta} />)
        : null}
    </svg>
  );
}

/** Just the circular mark. */
export function LogoMark({ className, mono = false, title = "QuickDesign" }: { className?: string; mono?: boolean; title?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={cn("block h-auto", className)}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      fill="currentColor"
    >
      {LOGO_SEGMENTS.map((segment) => (
        <path key={segment.d.slice(0, 24)} d={segment.d} fill={mono ? undefined : BRAND_COLORS[segment.color]} />
      ))}
      {LOGO_ARCS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
      <path d={LOGO_CORE} />
    </svg>
  );
}
