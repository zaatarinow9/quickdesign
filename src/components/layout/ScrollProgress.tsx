"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** Thin brand-gradient bar at the very top that shows reading progress. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="bg-brand-gradient fixed inset-x-0 top-0 z-[70] h-[3px] origin-left"
    />
  );
}
