"use client";

import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import { joinFolder } from "@/lib/files/shared";

/** Neuen Ordner anlegen: öffnet den (noch leeren) Ordner – er entsteht mit der ersten Datei */
export function NewFolderButton({ current }: { current: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="adm-btn adm-btn-ghost adm-btn-sm"
      onClick={() => {
        const name = window.prompt("Name des neuen Ordners:");
        const path = name ? joinFolder(current, name) : "";
        if (path && path !== current) router.push(`/admin/dateien?ordner=${encodeURIComponent(path)}`);
      }}
    >
      <FolderPlus className="size-4" aria-hidden /> Neuer Ordner
    </button>
  );
}
