"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment, type ElementType } from "react";
import { cn } from "@/lib/utils";

type Line = string | { text: string; className?: string };

type SplitTextProps = {
  /** Each entry renders on its own line; words reveal from behind a mask. */
  lines: Line[];
  as?: ElementType;
  id?: string;
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  /** Animate on mount (hero) instead of when scrolled into view. */
  immediate?: boolean;
};

/**
 * Masked word-by-word text reveal. Screen readers get the full sentence via
 * an sr-only copy; the animated words are hidden from assistive tech.
 */
export default function SplitText({
  lines,
  as: Tag = "h2",
  id,
  className,
  lineClassName,
  delay = 0,
  stagger = 0.06,
  duration = 1.1,
  immediate = false,
}: SplitTextProps) {
  const reduce = useReducedMotion();
  const normalized = lines.map((line) => (typeof line === "string" ? { text: line } : line));
  const fullText = normalized.map((line) => line.text).join(" ");
  let wordIndex = 0;

  const trigger = immediate
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once: true, amount: 0.4 } };

  return (
    <Tag id={id} className={className}>
      <span className="sr-only">{fullText}</span>
      <motion.span aria-hidden initial="hidden" {...trigger} className="block">
        {normalized.map((line, lineIdx) => (
          <span key={lineIdx} className={cn("block", lineClassName)}>
            {line.text.split(" ").map((word, idx, arr) => {
              const i = wordIndex++;
              return (
                <Fragment key={idx}>
                  <span className="inline-block overflow-hidden pb-[0.08em] align-bottom -mb-[0.08em]">
                    <motion.span
                      className={cn("inline-block will-change-transform", line.className)}
                      variants={{
                        hidden: reduce ? { opacity: 0 } : { y: "110%", rotate: 4 },
                        show: reduce ? { opacity: 1 } : { y: "0%", rotate: 0 },
                      }}
                      transition={{ duration, delay: delay + i * stagger, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {word}
                    </motion.span>
                  </span>
                  {idx < arr.length - 1 ? " " : null}
                </Fragment>
              );
            })}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
