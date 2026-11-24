"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

let firstRender = true;

/**
 * Seitenwechsel: kurzes, sanftes Einblenden (0,2 s) – kein Vorhang, keine Wartezeit.
 * Der erste Aufruf erscheint ohne Animation, damit der Inhalt (LCP) sofort sichtbar ist.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [animate] = useState(() => !firstRender);

  useEffect(() => {
    firstRender = false;
  }, []);

  if (!animate || reduce) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
