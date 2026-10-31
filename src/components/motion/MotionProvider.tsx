"use client";

import Lenis from "lenis";
import { MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Global motion setup:
 * - MotionConfig honours the OS "reduce motion" setting for every motion component.
 * - Lenis adds inertial smooth scrolling on desktop, and is skipped entirely
 *   for users who prefer reduced motion.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      anchors: { offset: -80 },
      autoRaf: true,
    });
    // Lenis is an external system; exposing its instance via state is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance);

    return () => {
      instance.destroy();
      setLenis(null);
    };
  }, []);

  // New page → start at the top without a long smooth scroll.
  useEffect(() => {
    if (window.location.hash) return;
    lenis?.scrollTo(0, { immediate: true, force: true });
  }, [pathname, lenis]);

  return (
    <LenisContext.Provider value={lenis}>
      <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </MotionConfig>
    </LenisContext.Provider>
  );
}
