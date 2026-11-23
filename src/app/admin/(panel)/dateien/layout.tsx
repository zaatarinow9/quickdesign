import { Suspense } from "react";
import { FolderTree as TreeIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings/server";
import { fileCounts, folderIndex } from "@/lib/files/server";
import { monthFolderPath, normalizeFolder } from "@/lib/files/shared";
import { ensureYearFolders } from "@/lib/customers/folder";
import { FolderTree } from "@/components/admin/files/FolderTree";

/** Dateien-Bereich: Ordnerbaum links (bleibt beim Wechseln stehen), Inhalt rechts */
export default async function FilesLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const s = await getSettings();
  const root = normalizeFolder(s.files.customerRoot) || "Kunden";
  await ensureYearFolders().catch(() => {});
  const [folders, counts, mine] = await Promise.all([
    folderIndex(),
    fileCounts(),
    db().from("files").select("id", { count: "exact", head: true }).eq("complete", true).eq("assigned_to", admin.email.toLowerCase()).neq("status", "erledigt"),
  ]);
  const tree = (
    <Suspense fallback={null}>
      <FolderTree folders={folders} customerRoot={root} thisMonth={monthFolderPath(root)} counts={{ mine: mine.count ?? 0, active: counts.aktiv }} />
    </Suspense>
  );
  return (
    <div className="lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-3xl bg-white p-3 shadow-sm ring-1 ring-ink/[0.06]">{tree}</div>
      </aside>
      <details className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-ink/[0.06] lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
          <TreeIcon className="size-4 text-accent" aria-hidden /> Ordner & Schnellzugriff
        </summary>
        <div className="mt-3">{tree}</div>
      </details>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
