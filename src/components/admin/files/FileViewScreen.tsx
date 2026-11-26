import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Folder } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { isR2Configured, presignDownload } from "@/lib/files/r2";
import { fileEvents, siblings } from "@/lib/files/server";
import { FileWorkflow } from "@/components/admin/files/FileWorkflow";
import { formatBytes, isFileStatus, viewerKind } from "@/lib/files/shared";
import { formatDateTime } from "@/lib/documents/format";
import { FileViewer } from "@/components/admin/files/FileViewer";
import { ViewerKeys, ViewerShell, ViewerClose } from "@/components/admin/files/ViewerNav";
import { DeleteButton } from "@/components/admin/DeleteControls";
import { FileIcon } from "@/components/admin/files/FileIcon";
import { Notice } from "@/components/admin/ui";
import { CopyLink } from "@/components/admin/files/CopyLink";
import { fileLink } from "@/lib/files/links";


const MIME: Record<string, string> = { ai: "application/pdf", pdf: "application/pdf", svg: "image/svg+xml", mov: "video/mp4", m4v: "video/mp4", txt: "text/plain; charset=utf-8" };

/** Betrachter – als eigene Seite oder schwebend über der Liste (modal) */
export async function FileViewScreen({ id, modal = false }: { id: string; modal?: boolean }) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: f } = await db()
    .from("files")
    .select("id, object_key, preview_key, name, size, content_type, folder, message, status, uploaded_by, assigned_to, created_at, complete, project:projects(id, number, title)")
    .eq("id", id)
    .maybeSingle();
  if (!f || !f.complete) notFound();
  if (!isR2Configured()) return <Notice tone="warn">Der Cloud-Speicher ist nicht verbunden.</Notice>;

  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  const kind = viewerKind(f.name, f.content_type);
  const [url, downloadUrl, list, previewUrl, events] = await Promise.all([
    presignDownload(f.object_key, f.name, { inline: true, seconds: 3600, contentType: MIME[ext] }),
    presignDownload(f.object_key, f.name, { seconds: 3600 }),
    siblings(f.folder ?? ""),
    f.preview_key ? presignDownload(f.preview_key, `${f.name}.jpg`, { inline: true, seconds: 3600, contentType: "image/jpeg" }) : Promise.resolve(null),
    fileEvents(f.id),
  ]);
  // Office-Dateien zeigt der Microsoft-Viewer an (er lädt die Datei über den zeitlich begrenzten Link)
  const officeUrl = kind === "office" ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}` : null;
  const idx = list.findIndex((s) => s.id === f.id);
  const prev = idx > 0 ? `/admin/dateien/${list[idx - 1].id}/ansicht` : null;
  const next = idx >= 0 && idx < list.length - 1 ? `/admin/dateien/${list[idx + 1].id}/ansicht` : null;
  const back = f.folder ? `/admin/dateien?ordner=${encodeURIComponent(f.folder)}` : "/admin/dateien";
  const project = (Array.isArray(f.project) ? f.project[0] : f.project) as { id: string; number: string; title: string } | null;

  return (
    <ViewerShell back={back} modal={modal}>
      <ViewerKeys prev={prev} next={next} back={back} modal={modal} />
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <ViewerClose back={back} modal={modal} />
        <FileIcon name={f.name} type={f.content_type} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" title={f.name}>
            {f.name}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-white/55">
            <span>{formatBytes(Number(f.size))}</span>
            <span>· {f.uploaded_by ?? "–"}</span>
            <span>· {formatDateTime(f.created_at)}</span>
            {f.folder ? (
              <Link href={back} className="inline-flex items-center gap-1 hover:text-white">
                · <Folder className="size-3" aria-hidden /> {f.folder}
              </Link>
            ) : null}
            {project ? (
              <Link href={`/admin/projekte/${project.id}`} className="hover:text-white">
                · {project.number} {project.title}
              </Link>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden text-xs tabular-nums text-white/50 sm:inline">{idx >= 0 ? `${idx + 1} / ${list.length}` : ""}</span>
          {prev ? (
            <Link href={prev} replace={modal} className="grid size-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Vorherige Datei">
              <ChevronLeft className="size-5" />
            </Link>
          ) : null}
          {next ? (
            <Link href={next} replace={modal} className="grid size-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Nächste Datei">
              <ChevronRight className="size-5" />
            </Link>
          ) : null}
          <CopyLink path={fileLink(f.id)} iconOnly className="grid size-9 place-items-center rounded-lg hover:bg-white/10" title="Link zu dieser Datei kopieren – nur für Personen mit Zugang zur Verwaltung" />
          <a href={url} target="_blank" rel="noopener" className="grid size-9 place-items-center rounded-lg hover:bg-white/10" title="In neuem Tab öffnen" aria-label="In neuem Tab öffnen">
            <ExternalLink className="size-4" />
          </a>
          <a href={downloadUrl} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold hover:bg-accent/90">
            <Download className="size-4" aria-hidden /> <span className="hidden sm:inline">Download</span>
          </a>
          <DeleteButton kind="datei" id={f.id} name={f.name} redirectTo={back} className="size-9 text-white/70 hover:bg-red-500/15 hover:text-red-400" />
        </div>
      </header>
      <FileWorkflow id={f.id} status={isFileStatus(f.status) ? f.status : "neu"} events={events} />
      {f.message ? <p className="whitespace-pre-line border-b border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/85 sm:px-6">💬 {f.message}</p> : null}
      <div data-viewer-backdrop className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        <FileViewer fileId={f.id} previewUrl={previewUrl} kind={kind} url={url} officeUrl={officeUrl} name={f.name} size={Number(f.size)} downloadUrl={downloadUrl} />
      </div>
    </ViewerShell>
  );
}
