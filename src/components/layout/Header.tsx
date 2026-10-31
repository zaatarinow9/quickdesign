"use client";

import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useLenis } from "@/components/motion/MotionProvider";
import { services } from "@/content/services";
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

/** Desktop mega-dropdown listing all services. */
function ServicesMenu({ active, pathname }: { active: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const show = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <li
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
    >
      <div className="flex items-center">
        <Link
          href="/leistungen"
          aria-current={pathname === "/leistungen" ? "page" : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            "group relative flex h-10 items-center rounded-full pl-4 pr-1 text-[0.95rem] transition-colors",
            active ? "text-paper" : "text-paper/70 hover:text-paper",
          )}
        >
          <RollText>Leistungen</RollText>
          {active ? <motion.span layoutId="nav-dot" className="absolute bottom-1 left-[45%] h-1 w-1 rounded-full bg-accent" /> : null}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="services-menu"
          aria-label="Leistungen anzeigen"
          onClick={() => setOpen((value) => !value)}
          className="grid h-10 w-7 place-items-center rounded-full text-paper/60 hover:text-paper"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")} />
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="services-menu"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-full z-50 w-[min(760px,90vw)] -translate-x-1/2 pt-4"
          >
            <div className="grid grid-cols-[1fr_15rem] overflow-hidden rounded-3xl bg-ink/95 text-paper shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-paper/10 backdrop-blur-xl">
              <ul className="grid grid-cols-2 gap-1 p-3">
                {services.map((service, i) => (
                  <motion.li
                    key={service.slug}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.3 }}
                  >
                    <Link
                      href={`/leistungen/${service.slug}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group/item flex flex-col rounded-2xl px-4 py-3 transition-colors hover:bg-paper/[0.06]",
                        pathname === `/leistungen/${service.slug}` && "bg-paper/[0.06]",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2 font-medium">
                        {service.short}
                        <ArrowRight className="h-4 w-4 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover/item:translate-x-0 group-hover/item:opacity-100" />
                      </span>
                      <span className="mt-0.5 text-sm text-paper/50">{service.claim}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="flex flex-col justify-between gap-6 border-l border-paper/10 bg-paper/[0.03] p-6">
                <div>
                  <p className="text-sm text-paper/50">Alles rund um Werbung</p>
                  <Link
                    href="/leistungen"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-medium hover:text-accent"
                  >
                    Alle Leistungen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <a href={printly.url} target="_blank" rel="noopener" className="group/p bg-brand-gradient block rounded-2xl p-4 text-paper">
                  <span className="text-sm text-paper/80">{printly.name}</span>
                  <span className="mt-1 flex items-end justify-between gap-2 font-medium leading-snug">
                    Druckprodukte online bestellen
                    <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform group-hover/p:-translate-y-0.5 group-hover/p:translate-x-0.5" />
                  </span>
                  <span className="sr-only">(öffnet in neuem Tab)</span>
                </a>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export default function Header() {
  const pathname = usePathname();
  const lenis = useLenis();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  // The header always stays visible; it only gains a solid background once the page is scrolled.
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const closeMenu = () => {
    setOpen(false);
    setServicesOpen(false);
  };

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
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
      >
        <div
          className={cn(
            "mx-auto flex h-16 max-w-[1440px] items-center justify-between rounded-full pl-6 pr-2.5 text-paper transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:h-[4.5rem] sm:pl-9 sm:pr-3",
            scrolled || open
              ? "bg-ink/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-paper/10 backdrop-blur-xl"
              : "bg-transparent",
          )}
        >
          <Link href="/" onClick={closeMenu} aria-label={`${site.name} – Startseite`} className="relative z-10 shrink-0 py-2 pr-4">
            <Logo className="w-[124px] py-1 sm:w-[144px]" />
          </Link>

          <nav aria-label="Hauptnavigation" className="hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {navigation.map((item) =>
                item.href === "/leistungen" ? (
                  <ServicesMenu key={item.href} active={isActive(item.href)} pathname={pathname} />
                ) : (
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
                        <motion.span
                          layoutId="nav-dot"
                          className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent"
                        />
                      ) : null}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={printly.url}
              target="_blank"
              rel="noopener"
              className="group hidden h-10 items-center gap-1.5 rounded-full px-4 text-[0.95rem] text-paper/70 transition-colors hover:text-paper xl:flex"
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
            className="grain fixed inset-0 z-40 bg-ink text-paper lg:hidden"
          >
            {/* Separate scroll container: iOS Safari does not scroll elements that carry a clip-path. */}
            <div
              data-lenis-prevent
              className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain px-6 pb-10 pt-28 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]"
            >
            <nav aria-label="Mobile Navigation" className="flex-1">
              <ul className="space-y-1">
                {navigation.map((item, i) => (
                  <li key={item.href}>
                    <div className="overflow-hidden">
                      <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center justify-between gap-4"
                      >
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className={cn(
                            "block py-1 font-[family-name:var(--font-display)] text-[2.6rem] font-medium leading-tight tracking-tight sm:text-6xl",
                            isActive(item.href) ? "text-accent" : "",
                          )}
                        >
                          {item.label}
                        </Link>
                        {item.href === "/leistungen" ? (
                          <button
                            type="button"
                            aria-expanded={servicesOpen}
                            aria-controls="mobile-services"
                            aria-label="Leistungen aufklappen"
                            onClick={() => setServicesOpen((value) => !value)}
                            className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-paper/20"
                          >
                            <ChevronDown className={cn("h-5 w-5 transition-transform duration-300", servicesOpen && "rotate-180")} />
                          </button>
                        ) : null}
                      </motion.div>
                    </div>
                    {item.href === "/leistungen" ? (
                      <AnimatePresence initial={false}>
                        {servicesOpen ? (
                          <motion.ul
                            id="mobile-services"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden border-l border-paper/15 pl-4"
                          >
                            {services.map((service) => (
                              <li key={service.slug}>
                                <Link
                                  href={`/leistungen/${service.slug}`}
                                  onClick={closeMenu}
                                  className={cn(
                                    "block py-2 text-lg text-paper/75",
                                    pathname === `/leistungen/${service.slug}` && "text-accent",
                                  )}
                                >
                                  {service.title}
                                </Link>
                              </li>
                            ))}
                          </motion.ul>
                        ) : null}
                      </AnimatePresence>
                    ) : null}
                  </li>
                ))}
              </ul>
            </nav>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-8 space-y-6 border-t border-paper/15 pt-6"
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
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
