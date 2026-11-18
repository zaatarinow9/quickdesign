import Link from "next/link";
import { Download, Eye, Trash2, UserRound } from "lucide-react";
import { deleteFile } from "@/app/admin/file-actions";
import { formatDateTime } from "@/lib/documents/format";
import { formatBytes, previewable, type StoredFile } from "@/lib/files/shared";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { FileIcon } from "./FileIcon";
import { FileStatusSelect } from "./FileStatusSelect";

/** Dateiliste – Download, Vorschau, Status, Löschen */
export function FileList({ files, showProject = true, team = [] }: { files: StoredFile[]; showProject?: boolean; team?: { email: string; name: string }[] }) {
  const nameOf = (email: string | null) => (email ? (team.find((m) => m.email === email)?.name ?? email) : null);
  return (
    <ul className="divide-y divide-ink/[0.06]">
      {files.map((f) => {
        const who = f.project ? (f.project.company_name || f.project.customer_name || "").trim() : "";
        return (
          <li key={f.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:px-5">
            <div className="flex min-w-0 flex-1 gap-3">
              <FileIcon name={f.name} type={f.content_type} />
              <div className="min-w-0 flex-1">
                <a href={`/admin/dateien/${f.id}`} className="block truncate font-medium hover:text-accent" title={f.name}>
                  {f.name}
                </a>
                <p className="mt-0.5 text-xs text-stone-dark">
                  {formatBytes(f.size)} · {f.uploaded_by ?? "–"} · {formatDateTime(f.created_at)}
                </p>
                {showProject && f.project ? (
                  <Link href={`/admin/projekte/${f.project.id}`} className="mt-1 inline-block max-w-full truncate rounded-full bg-ink/[0.04] px-2.5 py-0.5 text-xs hover:bg-accent/10 hover:text-accent">
                    {f.project.number} · {who ? `${who} – ` : ""}
                    {f.project.title}
                  </Link>
                ) : null}
                {f.assigned_to ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-stone-dark">
                    <UserRound className="size-3" aria-hidden /> für {nameOf(f.assigned_to)}
                  </p>
                ) : null}
                {f.message ? <p className="mt-2 whitespace-pre-line rounded-lg bg-[#f7f5f1] px-3 py-2 text-sm">{f.message}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pl-14 sm:pl-0">
              <FileStatusSelect id={f.id} status={f.status} />
              {previewable(f.name, f.content_type) ? (
                <a href={`/admin/dateien/${f.id}?ansicht=1`} target="_blank" rel="noopener" className="grid size-8 place-items-center rounded-md text-stone-dark hover:bg-ink/[0.06]" title="Ansehen" aria-label="Ansehen">
                  <Eye className="size-4" />
                </a>
              ) : null}
              <a href={`/admin/dateien/${f.id}`} className="adm-btn adm-btn-ghost adm-btn-sm" title="Herunterladen">
                <Download className="size-4" aria-hidden /> <span className="hidden sm:inline">Download</span>
              </a>
              <form action={deleteFile}>
                <input type="hidden" name="id" value={f.id} />
                <ConfirmSubmit className="grid size-8 place-items-center rounded-md text-stone-dark hover:bg-red-50 hover:text-red-700" message={`„${f.name}“ endgültig löschen?`}>
                  <Trash2 className="size-4" aria-label="Löschen" />
                </ConfirmSubmit>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
