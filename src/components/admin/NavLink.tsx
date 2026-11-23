"use client";

import Link, { useLinkStatus } from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Link für die Verwaltung: lädt die Zielseite komplett vor, sobald die Maus darüber fährt
 * (oder der Finger sie berührt) – der Klick wirkt dann sofort. Zeigt einen dezenten Ladezustand.
 */
export function NavLink({
  href,
  eager = false,
  className,
  children,
  onClick,
  ...rest
}: { href: string; eager?: boolean; className?: string; children: React.ReactNode; onClick?: () => void } & Omit<React.ComponentProps<typeof Link>, "href" | "prefetch" | "className" | "onClick">) {
  const [intent, setIntent] = useState(eager);
  const warm = () => setIntent(true);
  return (
    <Link href={href} prefetch={intent ? true : null} onMouseEnter={warm} onTouchStart={warm} onFocus={warm} onClick={onClick} className={className} {...rest}>
      {children}
      <Pending />
    </Link>
  );
}

/** Kleiner Lade-Punkt, solange die Seite noch kommt */
function Pending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("pointer-events-none ml-auto size-1.5 shrink-0 rounded-full bg-accent transition-opacity", pending ? "animate-pulse opacity-100" : "opacity-0")} />;
}
