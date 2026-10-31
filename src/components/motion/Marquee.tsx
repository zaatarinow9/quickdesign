import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Infinite CSS marquee (GPU-only, pauses for reduced motion via globals.css). */
export default function Marquee({
  items,
  className,
  itemClassName,
  separator,
  duration = 40,
  reverse = false,
}: {
  items: ReactNode[];
  className?: string;
  itemClassName?: string;
  separator?: ReactNode;
  duration?: number;
  reverse?: boolean;
}) {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <Fragment key={i}>
          <span className={itemClassName}>{item}</span>
          {separator}
        </Fragment>
      ))}
    </div>
  );

  return (
    <div className={cn("relative flex overflow-hidden", className)}>
      <div
        className="flex w-max animate-marquee motion-reduce:animate-none"
        style={{
          ["--marquee-duration" as string]: `${duration}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
