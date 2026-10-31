"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";

let firstRender = true;

/**
 * Curtain transition for client-side navigations. The very first page load
 * renders without a curtain so the hero (and LCP) appears immediately.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [withCurtain] = useState(() => !firstRender);

  useEffect(() => {
    firstRender = false;
  }, []);

  if (!withCurtain || reduce) {
    return <>{children}</>;
  }

  return (
    <>
      <motion.div
        aria-hidden
        initial={{ y: "0%" }}
        animate={{ y: "-100%" }}
        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
        className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-ink text-paper"
      >
        <motion.div initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4 }}>
          <LogoMark className="w-14" />
        </motion.div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </motion.div>
    </>
  );
}
