"use client";

import { Timer } from "lucide-react";
import { openTimer } from "./TimerDock";

export function StartTimerButton({ customerId }: { customerId?: string }) {
  return (
    <button type="button" onClick={() => openTimer(customerId)} className="adm-btn adm-btn-ghost">
      <Timer className="size-4 text-accent" aria-hidden /> Zeit
    </button>
  );
}
