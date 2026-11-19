import { requireAdmin } from "@/lib/auth";
import { fileCounts, thumbnailUrls, workflowFiles } from "@/lib/files/server";
import { FileBoard } from "@/components/admin/files/FileBoard";
import { DateienTabs } from "@/components/admin/files/DateienTabs";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Ablauf – Dateien" };

export default async function WorkflowPage() {
  const admin = await requireAdmin();
  const [files, counts] = await Promise.all([workflowFiles(), fileCounts()]);
  const thumbs = await thumbnailUrls(files);
  return (
    <>
      <PageHeader title="Ablauf" description="Wo steht jede Datei? Von „Neu“ über Freigabe und Druck bis „Erledigt“ – auf einen Blick." />
      <div className="mb-5">
        <DateienTabs active="ablauf" counts={{ alle: counts.alle, aktiv: counts.aktiv }} />
      </div>
      <FileBoard files={files} thumbs={thumbs} me={admin.email.toLowerCase()} />
    </>
  );
}
