"use client";

import { useEffect, useState } from "react";
import { calculateWorkSessionDurationMinutes, formatWorkDuration } from "@/lib/appointments/format";

type WorkSessionTimerProps = {
  startedAt: string;
  className?: string;
};

export function WorkSessionTimer({
  startedAt,
  className,
}: WorkSessionTimerProps) {
  const [durationLabel, setDurationLabel] = useState(() =>
    formatWorkDuration(
      calculateWorkSessionDurationMinutes({
        startedAt: new Date(startedAt),
        stoppedAt: null,
      }),
    ),
  );

  useEffect(() => {
    const updateDuration = () => {
      setDurationLabel(
        formatWorkDuration(
          calculateWorkSessionDurationMinutes({
            startedAt: new Date(startedAt),
            stoppedAt: null,
          }),
        ),
      );
    };

    updateDuration();
    const intervalId = window.setInterval(updateDuration, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [startedAt]);

  return <span className={className}>{durationLabel}</span>;
}
