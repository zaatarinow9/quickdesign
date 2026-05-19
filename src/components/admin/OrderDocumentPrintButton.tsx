"use client";

import { Printer } from "lucide-react";

export function OrderDocumentPrintButton({
  label = "Drucken",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 border border-neutral-950 bg-neutral-950 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800 print:hidden"
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
