import Link from "next/link";
import { ChevronRight, Folder, FolderOpen, FolderUp, HardDrive, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { isR2Configured } from "@/lib/files/r2";
import { fileCounts, listFiles, projectOptions, subfolders, teamMembers, thumbnailUrls } from "@/lib/files/server";
import { folderName, formatBytes, isFileStatus, normalizeFolder } from "@/lib/files/shared";
import { formatDateTime } from "@/lib/documents/format";
import { deleteFolder } from "@/app/admin/file-actions";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { FileList } from "@/components/admin/files/FileList";
import { NewFolderButton } from "@/components/admin/files/FolderBar";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { Card, EmptyState, FilterTabs, PageHeader, SearchForm } from "@/components/admin/ui";

export const metadata = { title: "Dateien" };

const href = (folder: string) => (folder ? `/admin/dateien?ordner=${encodeURIComponent(folder)}` : "/admin/dateien");

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; fuer?: string; ordner?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const status = isFileStatus(sp.status) ? sp.status : undefined;
  const mine = sp.fuer === "mich" || (sp.fuer ? sp.fuer.toLowerCase() === admin.email.toLowerCase() : false);
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const folder = normalizeFolder(sp.ordner);
  const flat = !!(status || q || mine);
  const configured = isR2Configured();

  const [files, counts, projects, team, folders] = await Promise.all([
    flat ? listFiles({ status, q, assignedTo: mine ? admin.email.toLowerCase() : undefined }) : listFiles({ folder }),
    fileCounts(),
    projectOptions(),
    teamMembers(),
    flat ? Promise.resolve([]) : subfolders(folder),
  ]);
  const thumbs = await thumbnailUrls(files);
  const active = mine ? "mich" : (status ?? "alle");
  const crumbs = folder ? folder.split("/").map((name, i, arr) => ({ name, path: arr.slice(0, i + 1).join("/") })) : [];

  return (
    <>
      <PageHeader title="Dateien" description="Fertige Dateien und ganze Ordner hineinziehen – sie liegen sofort für alle bereit. Klick auf eine Datei öffnet die Vorschau." />

      <Card className="mb-6" title={folder ? `Hochladen nach „${folderName(folder)}“` : "Hochladen"}>
        <FileUploader projects={projects} team={team} configured={configured} folder={flat ? "" : folder} />
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          active={active}
          items={[
            { key: "alle", label: "Alle", href: "/admin/dateien", count: counts.alle },
            { key: "mich", label: "Für mich", href: "/admin/dateien?fuer=mich" },
            { key: "bearbeitung", label: "In Bearbeitung", href: "/admin/dateien?status=bearbeitung", count: counts.bearbeitung },
            { key: "druckfertig", label: "Druckfertig", href: "/admin/dateien?status=druckfertig", count: counts.druckfertig },
            { key: "erledigt", label: "Erledigt", href: "/admin/dateien?status=erledigt", count: counts.erledigt },
          ]}
        />
        <SearchForm defaultValue={q} placeholder="In allen Ordnern suchen …" hidden={{ status }} />
      </div>

      <Card padded={false}>
        {!flat ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[0.06] px-4 py-3 sm:px-5">
            <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Ordnerpfad">
              <Link href="/admin/dateien" className={folder ? "inline-flex items-center gap-1.5 text-stone-dark hover:text-accent" : "inline-flex items-center gap-1.5 font-semibold"}>
                <HardDrive className="size-4" aria-hidden /> Alle Dateien
              </Link>
              {crumbs.map((c, i) => (
                <span key={c.path} className="inline-flex min-w-0 items-center gap-1">
                  <ChevronRight className="size-3.5 text-stone" aria-hidden />
                  {i === crumbs.length - 1 ? <span className="truncate font-semibold">{c.name}</span> : <Link href={href(c.path)} className="truncate text-stone-dark hover:text-accent">{c.name}</Link>}
                </span>
              ))}
            </nav>
            <div className="flex items-center gap-1.5">
              <NewFolderButton current={folder} />
              {folder && (files.length || folders.length) ? (
                <form action={deleteFolder}>
                  <input type="hidden" name="folder" value={folder} />
                  <ConfirmSubmit className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" message={`Ordner „${folderName(folder)}“ mit ALLEN Dateien und Unterordnern endgültig löschen?`}>
                    <Trash2 className="size-4" aria-hidden /> Ordner löschen
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>
          </div>
        ) : null}

        {folders.length ? (
          <ul className="grid gap-2 border-b border-ink/[0.06] p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {folders.map((f) => (
              <li key={f.path}>
                <Link href={href(f.path)} className="flex items-center gap-3 rounded-xl bg-[#f7f5f1] p-3 ring-1 ring-ink/[0.05] transition hover:bg-accent/[0.06] hover:ring-accent/40">
                  <Folder className="size-9 shrink-0 fill-amber-300/60 text-amber-500" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{f.name}</span>
                    <span className="block text-xs text-stone-dark">
                      {f.fileCount} Datei{f.fileCount === 1 ? "" : "en"} · {formatBytes(f.totalSize)}
                      {f.lastUpload ? ` · ${formatDateTime(f.lastUpload).split(",")[0]}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {files.length ? (
          <FileList files={files} team={team} thumbs={thumbs} showFolder={flat} />
        ) : !folders.length ? (
          <EmptyState
            icon={flat ? FolderUp : FolderOpen}
            title={flat ? "Keine passenden Dateien" : folder ? "Dieser Ordner ist noch leer" : "Noch keine Dateien"}
            text={flat ? undefined : "Oben Dateien oder ganze Ordner hineinziehen."}
          />
        ) : null}
      </Card>
    </>
  );
}
