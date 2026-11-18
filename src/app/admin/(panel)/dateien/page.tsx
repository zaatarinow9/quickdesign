import { FolderUp } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { isR2Configured } from "@/lib/files/r2";
import { fileCounts, listFiles, projectOptions, teamMembers } from "@/lib/files/server";
import { isFileStatus } from "@/lib/files/shared";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { FileList } from "@/components/admin/files/FileList";
import { Card, EmptyState, FilterTabs, PageHeader, SearchForm } from "@/components/admin/ui";

export const metadata = { title: "Dateien" };

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; fuer?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const status = isFileStatus(sp.status) ? sp.status : undefined;
  const mine = sp.fuer === "mich" || (sp.fuer ? sp.fuer.toLowerCase() === admin.email.toLowerCase() : false);
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const configured = isR2Configured();
  const [files, counts, projects, team] = await Promise.all([
    listFiles({ status, q, assignedTo: mine ? admin.email.toLowerCase() : undefined }),
    fileCounts(),
    projectOptions(),
    teamMembers(),
  ]);
  const active = mine ? "mich" : (status ?? "alle");

  return (
    <>
      <PageHeader title="Dateien" description="Fertige Dateien hochladen, mit Auftrag und Nachricht versehen und Kollegen benachrichtigen – keine USB-Sticks mehr." />

      <Card className="mb-6" title="Hochladen">
        <FileUploader projects={projects} team={team} configured={configured} />
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
        <SearchForm defaultValue={q} placeholder="Dateiname, Nachricht, Person …" hidden={{ status }} />
      </div>

      <Card padded={false}>
        {files.length ? (
          <FileList files={files} team={team} />
        ) : (
          <EmptyState icon={FolderUp} title={q || status || mine ? "Keine passenden Dateien" : "Noch keine Dateien"} text={q || status || mine ? undefined : "Oben einfach Dateien hineinziehen."} />
        )}
      </Card>
    </>
  );
}
