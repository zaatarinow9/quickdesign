"use client";

import { useOptimistic, useTransition } from "react";
import { setFileStatus } from "@/app/admin/file-actions";
import { fileStatuses, fileStatusInfo, isFileStatus, type FileStatus } from "@/lib/files/shared";
import { cn } from "@/lib/utils";

/** Status sofort umschalten (optimistisch), Server bestätigt im Hintergrund */
export function FileStatusSelect({ id, status }: { id: string; status: FileStatus }) {
  const [, start] = useTransition();
  const [shown, setShown] = useOptimistic(status);
  return (
    <select
      aria-label="Status"
      value={shown}
      onChange={(e) => {
        const next = e.target.value;
        if (!isFileStatus(next)) return;
        const fd = new FormData();
        fd.set("id", id);
        fd.set("status", next);
        start(async () => {
          setShown(next);
          await setFileStatus(fd);
        });
      }}
      className={cn("h-8 cursor-pointer rounded-full border-0 py-0 pl-3 pr-7 text-xs font-medium transition-colors", fileStatusInfo[shown].chip)}
    >
      {fileStatuses.map((s) => (
        <option key={s} value={s}>
          {fileStatusInfo[s].label}
        </option>
      ))}
    </select>
  );
}
