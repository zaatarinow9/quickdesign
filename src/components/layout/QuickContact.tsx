"use client";

import { ArrowUp, Mail, MessageSquare, Phone } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLenis } from "@/components/motion/MotionProvider";
import { site } from "@/content/site";

/**
 * Appears after the first screen:
 * - phones: a compact bottom bar with call, mail and enquiry
 * - desktop: a discreet "back to top" button
 */
export default function QuickContact() {
  const pathname = usePathname();
  const lenis = useLenis();
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setVisible(y > window.innerHeight * 0.9));

  const toTop = () => {
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <>
          {pathname !== "/kontakt" ? (
            <motion.nav
              key="bar"
              aria-label="Schnellkontakt"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-2 rounded-full bg-ink/85 p-2 text-paper shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-paper/10 backdrop-blur-xl md:hidden"
            >
              <a href={site.contact.phoneHref} aria-label="Anrufen" className="grid h-12 w-12 place-items-center rounded-full bg-paper/10">
                <Phone className="h-5 w-5" />
              </a>
              <a href={`mailto:${site.contact.email}`} aria-label="E-Mail schreiben" className="grid h-12 w-12 place-items-center rounded-full bg-paper/10">
                <Mail className="h-5 w-5" />
              </a>
              <Link href="/kontakt" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent font-medium text-paper">
                <MessageSquare className="h-4 w-4" />
                Projekt anfragen
              </Link>
            </motion.nav>
          ) : null}
          <motion.button
            key="top"
            type="button"
            onClick={toTop}
            aria-label="Nach oben"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="group fixed bottom-6 right-6 z-40 hidden h-14 w-14 place-items-center rounded-full bg-ink text-paper shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-paper/10 transition-colors hover:bg-accent md:grid"
          >
            <ArrowUp className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
          </motion.button>
        </>
      ) : null}
    </AnimatePresence>
  );
}
