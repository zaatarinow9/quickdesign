"use client";

import { useTransition } from "react";
import { setFileStatus } from "@/app/admin/file-actions";
import { fileStatuses, fileStatusInfo, type FileStatus } from "@/lib/files/shared";
import { cn } from "@/lib/utils";

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
      className={cn("h-8 cursor-pointer rounded-full border-0 py-0 pl-3 pr-7 text-xs font-medium", fileStatusInfo[status].chip, pending && "opacity-50")}
    >
      {fileStatuses.map((s) => (
        <option key={s} value={s}>
          {fileStatusInfo[s].label}
        </option>
      ))}
    </select>
  );
}
