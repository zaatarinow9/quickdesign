import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronRight, FolderOpen, FolderUp, HardDrive, Search, UserRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { isR2Configured } from "@/lib/files/r2";
import { allFolderPaths, customerOptionsForFolders, folderMeta, listFiles, projectOptions, subfolders, teamMembers, thumbnailUrls } from "@/lib/files/server";
import { fileTypeGroups, isFileStatus, isSortKey, normalizeFolder } from "@/lib/files/shared";
import { getSettings } from "@/lib/settings/server";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { FileBrowser } from "@/components/admin/files/FileBrowser";
import { FileSearch } from "@/components/admin/files/FileSearch";
import { Card, EmptyState } from "@/components/admin/ui";
import { CopyLink, folderLink } from "@/components/admin/files/CopyLink";

export const metadata = { title: "Dateien" };

const href = (folder: string) => (folder ? `/admin/dateien?ordner=${encodeURIComponent(folder)}` : "/admin/dateien");
const berlinDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

function sinceDate(v?: string) {
  if (v === "heute") return `${berlinDay()}T00:00:00+01:00`;
  if (v === "7" || v === "30") return new Date(Date.now() - Number(v) * 864e5).toISOString();
  if (v === "jahr") return `${berlinDay().slice(0, 4)}-01-01T00:00:00+01:00`;
  return undefined;
}

export default async function FilesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const jar = await cookies();
  const initialView = jar.get("qd_dateien_ansicht")?.value === "liste" ? "liste" : "raster";
  const sortCookie = jar.get("qd_dateien_sort")?.value;
  const initialSort = isSortKey(sortCookie) ? sortCookie : "name";

  const status = isFileStatus(sp.status) ? sp.status : undefined;
  const mine = sp.fuer === "mich" || (sp.fuer ? sp.fuer.toLowerCase() === admin.email.toLowerCase() : false);
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const type = sp.typ && fileTypeGroups[sp.typ] ? sp.typ : undefined;
  const since = sinceDate(sp.seit);
  const folder = normalizeFolder(sp.ordner);
  const inside = sp.in === "1" && !!folder;
  const searching = !!(status || q || type || since);
  const flat = searching || mine;
  const configured = isR2Configured();

  const [files, projects, team, folders, allFolders, customers, meta, settings] = await Promise.all([
    flat ? listFiles({ status, q, type, since, under: inside ? folder : undefined, assignedTo: mine ? admin.email.toLowerCase() : undefined }) : listFiles({ folder }),
    projectOptions(),
    teamMembers(),
    flat ? Promise.resolve([]) : subfolders(folder),
    allFolderPaths(),
    customerOptionsForFolders(),
    flat ? Promise.resolve(null) : folderMeta(folder),
    getSettings(),
  ]);
  const thumbs = await thumbnailUrls(files);
  const crumbs = folder ? folder.split("/").map((name, i, arr) => ({ name, path: arr.slice(0, i + 1).join("/") })) : [];
  const customer = meta?.customer ? (Array.isArray(meta.customer) ? meta.customer[0] : meta.customer) : null;
  const title = mine ? "Für mich" : searching ? "Suchergebnisse" : folder ? folder.split("/").pop()! : "Alle Dateien";

  return (
    <div className="space-y-5">
      <FileSearch folder={folder} />

      {/* Kopf: Pfad + Titel */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {!flat ? (
            <nav className="mb-1 flex min-w-0 flex-wrap items-center gap-1 text-xs text-stone-dark" aria-label="Ordnerpfad">
              <Link href="/admin/dateien" className="inline-flex items-center gap-1 hover:text-accent">
                <HardDrive className="size-3.5" aria-hidden /> Alle Dateien
              </Link>
              {crumbs.slice(0, -1).map((c) => (
                <span key={c.path} className="inline-flex min-w-0 items-center gap-1">
                  <ChevronRight className="size-3 text-stone" aria-hidden />
                  <Link href={href(c.path)} className="truncate hover:text-accent">
                    {c.name}
                  </Link>
                </span>
              ))}
            </nav>
          ) : null}
          <h1 className="flex min-w-0 items-center gap-2.5 text-2xl font-bold tracking-tight">
            {searching ? <Search className="size-6 text-accent" aria-hidden /> : <FolderOpen className="size-6 text-accent" aria-hidden />}
            <span className="truncate">{title}</span>
            {!flat && folder ? <CopyLink path={folderLink(folder)} iconOnly className="grid size-8 shrink-0 place-items-center rounded-lg text-stone-dark hover:bg-ink/[0.06] hover:text-accent" title="Link zu diesem Ordner kopieren – nur für Personen mit Zugang zur Verwaltung" /> : null}
          </h1>
          {searching ? (
            <p className="mt-1 text-sm text-stone-dark">
              {files.length} Treffer{q ? ` für „${q}“` : ""}
              {inside ? ` in „${folder.split("/").pop()}“` : " in allen Ordnern"}
            </p>
          ) : null}
        </div>
        {customer ? (
          <Link href={`/admin/kunden/${customer.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-500/20">
            <UserRound className="size-4" aria-hidden /> Kundenakte: {customer.company_name || customer.name}
          </Link>
        ) : null}
      </div>

      {!searching ? <FileUploader projects={projects} team={team} configured={configured} folder={flat ? "" : folder} allFolders={allFolders} compact /> : null}

      <Card padded={false}>
        <FileBrowser
          files={files}
          folders={folders}
          thumbs={thumbs}
          folder={folder}
          flat={flat}
          initialView={initialView}
          initialSort={initialSort}
          allFolders={allFolders}
          customers={customers}
          team={team}
          quickFolders={folder && meta?.customer ? settings.files.projectFolders : []}
        />
        {!files.length && !folders.length ? (
          <EmptyState
            icon={searching ? Search : FolderUp}
            title={searching ? "Nichts gefunden" : mine ? "Keine Dateien für Sie" : folder ? "Dieser Ordner ist noch leer" : "Noch keine Dateien"}
            text={searching ? "Anderen Begriff versuchen oder Filter lockern." : "Dateien oder ganze Ordner auf die Seite ziehen – oder oben „Neuer Ordner“."}
          />
        ) : null}
      </Card>
    </div>
  );
}
