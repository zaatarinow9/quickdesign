"use client";

import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { initials, personColor, type TaskStatus, type TeamMember } from "@/lib/tasks/shared";
import { cn } from "@/lib/utils";

export function Avatar({ email, team, size = 24 }: { email: string; team: TeamMember[]; size?: number }) {
  const name = team.find((m) => m.email === email)?.name ?? email;
  return (
    <span
      title={name}
      className="grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-white"
      style={{ width: size, height: size, background: personColor(email), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  if (status === "erledigt") return <CheckCircle2 className={cn("text-emerald-600", className)} aria-hidden />;
  if (status === "in_arbeit") return <CircleDot className={cn("text-violet-600", className)} aria-hidden />;
  return <Circle className={cn("text-stone", className)} aria-hidden />;
}

