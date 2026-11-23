import Link from "next/link";
import { Archive, ChevronRight, Printer } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { isR2Configured } from "@/lib/files/r2";
import { listFiles, printDays, projectOptions, teamMembers, thumbnailUrls } from "@/lib/files/server";
import { formatBytes, PRINT_QUEUE, printDayLabel, printFolderFor } from "@/lib/files/shared";
import { todayBerlin } from "@/lib/documents/format";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { PrintQueue } from "@/components/admin/files/PrintQueue";
import { Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Druck" };
const href = (p: string) => `/admin/dateien?ordner=${encodeURIComponent(p)}`;

export default async function PrintPage() {
  await requireAdmin();
  const today = todayBerlin();
  // Warteschlange + noch nicht erledigte Dateien aus dem alten Tagesordner von heute
  const [queue, legacy, days, projects, team] = await Promise.all([listFiles({ folder: PRINT_QUEUE }), listFiles({ folder: printFolderFor(today) }), printDays(), projectOptions(), teamMembers()]);
  const files = [...queue, ...legacy.filter((f) => f.status !== "erledigt")].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const thumbs = await thumbnailUrls(files);
  const printed = days.filter((d) => d.path.startsWith("Druck/Gedruckt/"));
  const older = days.filter((d) => !d.path.startsWith("Druck/Gedruckt/"));

  return (
    <div className="space-y-6">
      <PageHeader title="Druck" description="Oben die Warteschlange „Heute drucken“. Nach dem Drucken abhaken – die Datei wandert automatisch in den Ordner des Drucktages." />
      <FileUploader projects={projects} team={team} configured={isR2Configured()} folder={PRINT_QUEUE} compact />
      <Card padded={false} title={<span className="flex items-center gap-2"><Printer className="size-4 text-accent" aria-hidden /> Heute drucken {files.length ? <span className="rounded-full bg-accent px-2 text-xs text-white">{files.length}</span> : null}</span>}>
        <PrintQueue files={files} thumbs={thumbs} />
      </Card>
      <Card padded={false} title={<span className="flex items-center gap-2"><Archive className="size-4 text-emerald-600" aria-hidden /> Gedruckt – nach Tagen</span>}>
        {printed.length ? (
          <ul className="divide-y divide-ink/[0.05]">
            {printed.map((d) => (
              <li key={d.path}>
                <Link href={href(d.path)} className="flex items-center gap-3 px-5 py-3 hover:bg-ink/[0.02]">
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700">
                    <Archive className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{d.date === today ? "Heute" : printDayLabel(d.date)}</span>
                    <span className="block text-xs text-stone-dark">
                      {d.total} Datei{d.total === 1 ? "" : "en"} · {formatBytes(d.size)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-stone" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-stone-dark">Noch nichts gedruckt – sobald Sie oben „Gedruckt“ klicken, entsteht hier der Ordner des Tages.</p>
        )}
      </Card>
      {older.length ? (
        <Card padded={false} title="Ältere Druck-Tagesordner">
          <ul className="divide-y divide-ink/[0.05]">
            {older.map((d) => (
              <li key={d.path}>
                <Link href={href(d.path)} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-ink/[0.02]">
                  <span>{printDayLabel(d.date)}</span>
                  <span className="text-xs text-stone-dark">{d.total} Datei(en)</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
