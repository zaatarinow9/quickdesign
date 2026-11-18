"use client";

import { useTransition } from "react";
import { setFileStatus } from "@/app/admin/file-actions";
import { fileStatuses, fileStatusInfo, type FileStatus } from "@/lib/files/shared";
import { cn } from "@/lib/utils";

const tones: Record<FileStatus, string> = {
  bearbeitung: "bg-amber-500/12 text-amber-800",
  druckfertig: "bg-emerald-500/12 text-emerald-800",
  erledigt: "bg-ink/[0.06] text-stone-dark",
};

export function FileStatusSelect({ id, status }: { id: string; status: FileStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Status"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("status", e.target.value);
        start(() => setFileStatus(fd));
      }}
      className={cn("h-8 cursor-pointer rounded-full border-0 py-0 pl-3 pr-7 text-xs font-medium", tones[status], pending && "opacity-50")}
    >
      {fileStatuses.map((s) => (
        <option key={s} value={s}>
          {fileStatusInfo[s].label}
        </option>
      ))}
    </select>
  );
}
