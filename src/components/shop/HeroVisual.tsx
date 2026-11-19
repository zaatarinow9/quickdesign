"use client";

import { motion, useReducedMotion } from "motion/react";
import { Artwork, starPath } from "./Artwork";

/** Hero-Bild: wehende Fahne mit Goldschimmer und schwebenden Sternen */
export function HeroVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(0,122,61,0.35),transparent_65%)] blur-2xl" />
      <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(216,178,94,0.28),transparent_60%)] blur-xl" />
      {/* Goldener Ring */}
      <motion.svg
        viewBox="0 0 400 400"
        className="absolute inset-0 h-full w-full"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        aria-hidden
      >
        <defs>
          <linearGradient id="hv-gold" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f6e3a7" />
            <stop offset="0.5" stopColor="#b88a35" />
            <stop offset="1" stopColor="#ecd08a" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="186" fill="none" stroke="url(#hv-gold)" strokeWidth="1" strokeDasharray="2 6" opacity="0.7" />
        <circle cx="200" cy="200" r="170" fill="none" stroke="url(#hv-gold)" strokeWidth="0.6" opacity="0.4" />
        {[0, 120, 240].map((a) => (
          <path key={a} d={starPath(200 + 186 * Math.cos((a * Math.PI) / 180), 200 + 186 * Math.sin((a * Math.PI) / 180), 8)} fill="#ce1126" />
        ))}
      </motion.svg>
      <motion.div
        className="absolute inset-[9%]"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={reduce ? { duration: 0.6 } : { opacity: { duration: 0.9 }, scale: { duration: 0.9 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
      >
        <Artwork art="flag" tone="light" className="h-full w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)] [&_svg]:h-full [&_svg]:w-full" />
      </motion.div>
    </div>
  );
}
