import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronRight, FolderOpen, FolderUp, HardDrive, UserRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { isR2Configured } from "@/lib/files/r2";
import {
  allFolderPaths,
  customerOptionsForFolders,
  fileCounts,
  folderMeta,
  listFiles,
  projectOptions,
  subfolders,
  teamMembers,
  thumbnailUrls,
} from "@/lib/files/server";
import { folderName, isFileStatus, isSortKey, normalizeFolder } from "@/lib/files/shared";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { FileBrowser } from "@/components/admin/files/FileBrowser";
import { Card, EmptyState, FilterTabs, PageHeader, SearchForm } from "@/components/admin/ui";

export const metadata = { title: "Dateien" };

const href = (folder: string) => (folder ? `/admin/dateien?ordner=${encodeURIComponent(folder)}` : "/admin/dateien");

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; fuer?: string; ordner?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const jar = await cookies();
  const initialView = jar.get("qd_dateien_ansicht")?.value === "liste" ? "liste" : "raster";
  const sortCookie = jar.get("qd_dateien_sort")?.value;
  const initialSort = isSortKey(sortCookie) ? sortCookie : "name";

  const status = isFileStatus(sp.status) ? sp.status : undefined;
  const mine = sp.fuer === "mich" || (sp.fuer ? sp.fuer.toLowerCase() === admin.email.toLowerCase() : false);
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const folder = normalizeFolder(sp.ordner);
  const flat = !!(status || q || mine);
  const configured = isR2Configured();

  const [files, counts, projects, team, folders, allFolders, customers, meta] = await Promise.all([
    flat ? listFiles({ status, q, assignedTo: mine ? admin.email.toLowerCase() : undefined }) : listFiles({ folder }),
    fileCounts(),
    projectOptions(),
    teamMembers(),
    flat ? Promise.resolve([]) : subfolders(folder),
    allFolderPaths(),
    customerOptionsForFolders(),
    flat ? Promise.resolve(null) : folderMeta(folder),
  ]);
  const thumbs = await thumbnailUrls(files);
  const active = mine ? "mich" : (status ?? "alle");
  const crumbs = folder ? folder.split("/").map((name, i, arr) => ({ name, path: arr.slice(0, i + 1).join("/") })) : [];
  const customer = meta?.customer ? (Array.isArray(meta.customer) ? meta.customer[0] : meta.customer) : null;

  return (
    <>
      <PageHeader title="Dateien" description="Ordner für Kunden und Aufträge, Dateien hineinziehen – Vorschau und Download direkt im Browser." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          active={active}
          items={[
            { key: "alle", label: "Ordner", href: "/admin/dateien", count: counts.alle },
            { key: "mich", label: "Für mich", href: "/admin/dateien?fuer=mich" },
            { key: "bearbeitung", label: "In Bearbeitung", href: "/admin/dateien?status=bearbeitung", count: counts.bearbeitung },
            { key: "druckfertig", label: "Druckfertig", href: "/admin/dateien?status=druckfertig", count: counts.druckfertig },
            { key: "erledigt", label: "Erledigt", href: "/admin/dateien?status=erledigt", count: counts.erledigt },
          ]}
        />
        <SearchForm defaultValue={q} placeholder="In allen Ordnern suchen …" hidden={{ status }} />
      </div>

      {!flat ? (
        <nav className="mb-3 flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Ordnerpfad">
          <Link href="/admin/dateien" className={folder ? "inline-flex items-center gap-1.5 text-stone-dark hover:text-accent" : "inline-flex items-center gap-1.5 font-semibold"}>
            <HardDrive className="size-4" aria-hidden /> Alle Dateien
          </Link>
          {crumbs.map((c, i) => (
            <span key={c.path} className="inline-flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3.5 text-stone" aria-hidden />
              {i === crumbs.length - 1 ? <span className="truncate font-semibold">{c.name}</span> : <Link href={href(c.path)} className="truncate text-stone-dark hover:text-accent">{c.name}</Link>}
            </span>
          ))}
          {customer ? (
            <Link href={`/admin/kunden/${customer.id}`} className="ml-2 inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs text-sky-700 hover:bg-sky-500/20">
              <UserRound className="size-3" aria-hidden /> Kundenakte: {customer.company_name || customer.name}
            </Link>
          ) : null}
        </nav>
      ) : null}

      <div className="mb-6">
        <FileUploader projects={projects} team={team} configured={configured} folder={flat ? "" : folder} compact />
        {!flat && folder ? <p className="mt-1.5 text-xs text-stone-dark">Neue Dateien landen in „{folderName(folder)}“.</p> : null}
      </div>

      <Card padded={false}>
        {files.length || folders.length ? (
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
          />
        ) : (
          <>
            {!flat ? (
              <FileBrowser
                files={[]}
                folders={[]}
                thumbs={{}}
                folder={folder}
                flat={false}
                initialView={initialView}
                initialSort={initialSort}
                allFolders={allFolders}
                customers={customers}
                team={team}
              />
            ) : null}
            <EmptyState
              icon={flat ? FolderUp : FolderOpen}
              title={flat ? "Keine passenden Dateien" : folder ? "Dieser Ordner ist noch leer" : "Noch keine Dateien"}
              text={flat ? undefined : "Oben Dateien oder ganze Ordner hineinziehen – oder einen Ordner anlegen (z. B. für einen Kunden)."}
            />
          </>
        )}
      </Card>
    </>
  );
}
