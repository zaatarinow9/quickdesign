"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

const WORD = "QuickDesign";
const MAGENTA = [223, 25, 134];
const CYAN = [47, 167, 223];

function mix(t: number) {
  const c = MAGENTA.map((m, i) => Math.round(m + (CYAN[i] - m) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function Letter({ char, index, progress, reduce }: { char: string; index: number; progress: MotionValue<number>; reduce: boolean }) {
  const count = WORD.length;
  const start = (index / count) * 0.7;
  const end = start + 0.3;
  // Each letter fills with "ink" from the bottom up, one after another.
  const fill = useTransform(progress, [start, end], reduce ? ["inset(0% 0 0 0)", "inset(0% 0 0 0)"] : ["inset(100% 0 0 0)", "inset(0% 0 0 0)"]);

  return (
    <motion.span
      className="relative inline-block cursor-default"
      initial={reduce ? false : { y: "70%", opacity: 0 }}
      whileInView={{ y: "0%", opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: "-8%", transition: { type: "spring", stiffness: 400, damping: 15 } }}
    >
      <span className="text-outline text-paper/20">{char}</span>
      <motion.span aria-hidden className="absolute inset-0" style={{ clipPath: fill, color: mix(index / (count - 1)) }}>
        {char}
      </motion.span>
    </motion.span>
  );
}

/** Large closing wordmark: letters rise in, then fill with the brand colours (magenta → cyan) as you scroll. */
export default function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });

  return (
    <div ref={ref} aria-hidden className="container-x select-none pb-10 pt-4 sm:pb-14">
      <p className="whitespace-nowrap text-center font-[family-name:var(--font-display)] text-[15.5vw] font-semibold leading-[0.95] tracking-[-0.05em] 2xl:text-[14rem]">
        {WORD.split("").map((char, i) => (
          <Letter key={i} char={char} index={i} progress={scrollYProgress} reduce={reduce} />
        ))}
      </p>
    </div>
  );
}
