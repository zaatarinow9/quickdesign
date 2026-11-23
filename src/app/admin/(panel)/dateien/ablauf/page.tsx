import { requireAdmin } from "@/lib/auth";
import { thumbnailUrls, workflowFiles } from "@/lib/files/server";
import { FileBoard } from "@/components/admin/files/FileBoard";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Ablauf – Dateien" };

export default async function WorkflowPage() {
  const admin = await requireAdmin();
  const files = await workflowFiles();
  const thumbs = await thumbnailUrls(files);
  return (
    <>
      <PageHeader title="Ablauf" description="Wo steht jede Datei? Neu → In Arbeit → Fertig – Karten ziehen oder einen Klick weiterschieben." />
      <FileBoard files={files} thumbs={thumbs} me={admin.email.toLowerCase()} />
    </>
  );
}
