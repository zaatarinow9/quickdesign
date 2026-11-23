import Link from "next/link";
import { CalendarDays, ChevronRight, Printer } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { isR2Configured } from "@/lib/files/r2";
import { allFolderPaths, printDays, projectOptions, teamMembers } from "@/lib/files/server";
import { fileStatuses, fileStatusInfo, formatBytes, printDayLabel, printFolderFor } from "@/lib/files/shared";
import { todayBerlin } from "@/lib/documents/format";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Druck – Tagesordner" };

const href = (path: string) => `/admin/dateien?ordner=${encodeURIComponent(path)}`;

function StatusBar({ byStatus, total }: { byStatus: Partial<Record<string, number>>; total: number }) {
  if (!total) return <div className="h-2 rounded-full bg-ink/[0.06]" />;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-ink/[0.06]">
      {fileStatuses.map((s) =>
        byStatus[s] ? <span key={s} className={fileStatusInfo[s].bar} style={{ width: `${((byStatus[s] ?? 0) / total) * 100}%` }} title={`${fileStatusInfo[s].label}: ${byStatus[s]}`} /> : null,
      )}
    </div>
  );
}

export default async function PrintPage() {
  await requireAdmin();
  const today = todayBerlin();
  const [days, projects, team, allFolders] = await Promise.all([printDays(), projectOptions(), teamMembers(), allFolderPaths()]);
  const todayEntry = days.find((d) => d.date === today) ?? { date: today, path: printFolderFor(today), total: 0, size: 0, byStatus: {}, last: null };
  const past = days.filter((d) => d.date !== today);

  return (
    <>
      <PageHeader title="Druck – Tagesordner" description="Alles, was für den Druck hochgeladen wird, landet automatisch im Ordner des Tages. So sieht man sofort, was heute anliegt und was schon gedruckt ist." />

      <Card className="mb-6" title={<span className="flex items-center gap-2"><Printer className="size-4 text-accent" aria-hidden /> Heute · {printDayLabel(today)}</span>} action={<Link href={href(todayEntry.path)} className="text-xs text-accent hover:underline">Ordner öffnen →</Link>}>
        <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <StatusBar byStatus={todayEntry.byStatus} total={todayEntry.total} />
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-dark">
              <span className="font-semibold text-ink">
                {todayEntry.total} Datei{todayEntry.total === 1 ? "" : "en"} · {formatBytes(todayEntry.size)}
              </span>
              {fileStatuses.map((s) =>
                todayEntry.byStatus[s] ? (
                  <span key={s} className="inline-flex items-center gap-1">
                    <span className={cn("size-2 rounded-full", fileStatusInfo[s].dot)} /> {fileStatusInfo[s].label}: {todayEntry.byStatus[s]}
                  </span>
                ) : null,
              )}
            </p>
          </div>
        </div>
        <FileUploader projects={projects} team={team} configured={isR2Configured()} folder={todayEntry.path} allFolders={allFolders} defaultTarget="druck" compact />
      </Card>

      <Card title={<span className="flex items-center gap-2"><CalendarDays className="size-4 text-accent" aria-hidden /> Frühere Tage</span>} padded={false}>
        {past.length ? (
          <ul className="divide-y divide-ink/[0.06]">
            {past.map((d) => {
              const open = d.total - (d.byStatus.erledigt ?? 0);
              return (
                <li key={d.path}>
                  <Link href={href(d.path)} className="grid gap-2 px-5 py-3.5 hover:bg-ink/[0.02] sm:grid-cols-[14rem_1fr_auto] sm:items-center sm:gap-5">
                    <span>
                      <span className="block font-medium">{printDayLabel(d.date)}</span>
                      <span className="block text-xs text-stone-dark">
                        {d.total} Datei{d.total === 1 ? "" : "en"} · {formatBytes(d.size)}
                      </span>
                    </span>
                    <StatusBar byStatus={d.byStatus} total={d.total} />
                    <span className="flex items-center gap-2 text-xs">
                      {open ? <span className="rounded-full bg-amber-500/14 px-2.5 py-0.5 font-medium text-amber-800">{open} offen</span> : d.total ? <span className="rounded-full bg-emerald-500/14 px-2.5 py-0.5 font-medium text-emerald-800">alles erledigt</span> : null}
                      <ChevronRight className="size-4 text-stone" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={CalendarDays} title="Noch keine früheren Tage" text="Jeder Tag mit Druckdaten erscheint hier automatisch." />
        )}
      </Card>
    </>
  );
}
