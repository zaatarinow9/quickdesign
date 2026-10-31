"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useLenis } from "@/components/motion/MotionProvider";
import { navigation, printly, site } from "@/content/site";
import { cn } from "@/lib/utils";

/** Text that rolls upward on hover — the duplicate slides in from below. */
function RollText({ children }: { children: string }) {
  return (
    <span className="relative inline-block overflow-hidden align-top">
      <span className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
      >
        {children}
      </span>
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();
  const lenis = useLenis();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(y > 40);
    setHidden(y > 480 && y > previous + 2 && !open);
    if (y < previous - 2) setHidden(false);
  });

  // Freeze page scroll while the overlay menu is open.
  useEffect(() => {
    if (open) {
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
    } else {
      lenis?.start();
      document.documentElement.style.overflow = "";
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lenis]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a
        href="#inhalt"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-accent px-5 py-3 text-sm font-medium text-paper focus:translate-y-0"
      >
        Zum Inhalt springen
      </a>

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: hidden ? -110 : 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: hidden ? 0 : 0.05 }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
      >
        <div
          className={cn(
            "mx-auto flex h-16 max-w-[1440px] items-center justify-between rounded-full pl-6 pr-2.5 text-paper transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:h-[4.5rem] sm:pl-9 sm:pr-3",
            scrolled || open
              ? "bg-ink/75 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-paper/10 backdrop-blur-xl"
              : "bg-transparent",
          )}
        >
          <Link href="/" onClick={() => setOpen(false)} aria-label={`${site.name} – Startseite`} className="relative z-10 shrink-0 py-2 pr-4">
            <Logo className="w-[124px] py-1 sm:w-[144px]" />
          </Link>

          <nav aria-label="Hauptnavigation" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "group relative flex h-10 items-center rounded-full px-4 text-[0.95rem] transition-colors",
                      isActive(item.href) ? "text-paper" : "text-paper/70 hover:text-paper",
                    )}
                  >
                    <RollText>{item.label}</RollText>
                    {isActive(item.href) ? (
                      <motion.span layoutId="nav-dot" className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={printly.url}
              target="_blank"
              rel="noopener"
              className="group hidden h-10 items-center gap-1.5 rounded-full px-4 text-[0.95rem] text-paper/70 transition-colors hover:text-paper md:flex"
            >
              <RollText>Online drucken</RollText>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span className="sr-only">(QuickPrintly, öffnet in neuem Tab)</span>
            </a>
            <Link
              href="/kontakt"
              className="group hidden h-11 items-center rounded-full bg-accent px-5 text-[0.95rem] font-medium text-paper transition-colors hover:bg-paper hover:text-ink sm:flex"
            >
              <RollText>Projekt anfragen</RollText>
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
              className="relative grid h-11 w-11 place-items-center rounded-full bg-paper text-ink lg:hidden"
            >
              <span className="relative block h-3 w-5">
                <span
                  className={cn(
                    "absolute left-0 h-[1.5px] w-full bg-current transition-all duration-500",
                    open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 h-[1.5px] w-full bg-current transition-all duration-500",
                    open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            initial={{ clipPath: "circle(0% at calc(100% - 3rem) 2.5rem)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 3rem) 2.5rem)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 3rem) 2.5rem)" }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="grain fixed inset-0 z-40 flex flex-col bg-ink px-6 pb-8 pt-28 text-paper lg:hidden"
          >
            <nav aria-label="Mobile Navigation" className="flex-1">
              <ul className="space-y-1">
                {[{ href: "/", label: "Start" }, ...navigation].map((item, i) => (
                  <li key={item.href} className="overflow-hidden">
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-baseline gap-4 py-1 font-[family-name:var(--font-display)] text-5xl font-medium tracking-tight sm:text-6xl",
                          isActive(item.href) || (item.href === "/" && pathname === "/") ? "text-accent" : "",
                        )}
                      >
                        <span className="font-mono text-xs text-paper/40">0{i + 1}</span>
                        {item.label}
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </nav>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="space-y-6 border-t border-paper/15 pt-6"
            >
              <a
                href={printly.url}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between rounded-2xl bg-paper/5 px-5 py-4 ring-1 ring-paper/10"
              >
                <span>
                  <span className="block text-xs text-paper/50">{printly.name}</span>
                  <span className="mt-1 block font-medium">{printly.cta}</span>
                </span>
                <ArrowUpRight className="h-5 w-5 text-accent" />
              </a>
              <div className="flex flex-col gap-1 text-paper/70">
                <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
                <a href={site.contact.phoneHref}>{site.contact.phone}</a>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
