"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarPlus } from "lucide-react";

/** „Neuer Termin" – öffnet den Dialog auf der Terminseite (optional für einen Kunden) */
export function NewAppointmentButton({ customerId, label = "Neuer Termin", className = "adm-btn adm-btn-primary" }: { customerId?: string; label?: string; className?: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const p = new URLSearchParams(pathname === "/admin/termine" ? sp.toString() : "");
  p.set("neu", "1");
  p.delete("termin");
  if (customerId) p.set("kunde", customerId);
  return (
    <Link href={`/admin/termine?${p}`} scroll={false} className={className}>
      <CalendarPlus className="size-4" aria-hidden /> {label}
    </Link>
  );
}
