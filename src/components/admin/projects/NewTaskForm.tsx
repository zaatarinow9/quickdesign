"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { createTask } from "@/app/admin/project-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { appointmentInfo, appointmentTypes, type AppointmentType } from "@/lib/projects/shared";
import { appointmentIcons } from "./AppointmentIcons";
import { Notice } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

const suggestions: Partial<Record<AppointmentType, string>> = {
  besorgung: "z. B. Folien bei Großhändler XY abholen",
  montage: "z. B. Schild bei Kunde XY anbringen",
  lieferung: "z. B. Banner zu XY bringen",
  abholung: "z. B. Kunde holt Visitenkarten ab",
  sonstiges: "z. B. Aufmaß / Besprechung vor Ort",
};

/** Schnell einen freien Termin anlegen – nur das Nötigste */
export function NewTaskForm({ today, tomorrow }: { today: string; tomorrow: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createTask, {});
  const [type, setType] = useState<AppointmentType>("besorgung");
  const [date, setDate] = useState(tomorrow);
  return (
    <form action={action} className="adm-card max-w-2xl space-y-5 p-5 sm:p-6">
      <input type="hidden" name="appointment_type" value={type} />
      <div>
        <span className="adm-label">Art</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {appointmentTypes.map((t) => {
            const Icon = appointmentIcons[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cn("flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-sm ring-1", type === t ? "bg-accent/[0.07] font-semibold text-accent ring-2 ring-accent" : "bg-white ring-ink/10 hover:ring-ink/25")}
              >
                <Icon className="size-5" aria-hidden /> {appointmentInfo[t].label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="adm-label" htmlFor="title">
          Was ist zu tun? *
        </label>
        <input id="title" name="title" required autoFocus className="adm-input text-base" placeholder={suggestions[type]} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="adm-label" htmlFor="appointment_date">
            Datum *
          </label>
          <input id="appointment_date" name="appointment_date" type="date" required className="adm-input" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="mt-1.5 flex gap-1.5 text-xs">
            {[
              ["Heute", today],
              ["Morgen", tomorrow],
            ].map(([label, d]) => (
              <button key={d} type="button" onClick={() => setDate(d)} className={cn("rounded-full px-2.5 py-1 ring-1", date === d ? "bg-ink text-white ring-ink" : "ring-ink/10 hover:ring-ink/30")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="adm-label" htmlFor="appointment_time">
            Uhrzeit
          </label>
          <input id="appointment_time" name="appointment_time" type="time" step={900} className="adm-input" />
        </div>
      </div>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-stone-dark">Ort, Hinweise und „Dringend senden“ im nächsten Schritt.</p>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Weiter
        </button>
      </div>
    </form>
  );
}
