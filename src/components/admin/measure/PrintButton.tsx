"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="adm-btn adm-btn-primary">
      <Printer className="size-4" aria-hidden /> Drucken / als PDF speichern
    </button>
  );
}
