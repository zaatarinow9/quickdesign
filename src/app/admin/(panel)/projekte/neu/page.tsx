import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { addDays, todayBerlin } from "@/lib/documents/format";
import { NewTaskForm } from "@/components/admin/projects/NewTaskForm";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Neuer Termin" };

export default async function NewTaskPage() {
  await requireAdmin();
  const today = todayBerlin();
  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/projekte" className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> Aufträge & Termine
          </Link>
        }
        title="Neuer Termin"
        description="Für alles ohne Angebot – z. B. Material holen, Aufmaß, Besprechung. Kommt automatisch in den Einsatzplan."
      />
      <NewTaskForm today={today} tomorrow={addDays(today, 1)} />
    </>
  );
}
