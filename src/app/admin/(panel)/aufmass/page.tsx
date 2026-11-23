import { requireAdmin } from "@/lib/auth";
import { MeasurementList } from "@/components/admin/measure/MeasurementList";
import { PageHeader, SearchForm } from "@/components/admin/ui";

export const metadata = { title: "Aufmaß" };

export default async function MeasurementsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  return (
    <>
      <PageHeader title="Aufmaß" description="Maße vor Ort erfassen: Foto, Breite × Höhe in cm mit Pfeilen auf dem Bild, Notizen – alles landet automatisch beim Kunden." />
      <div className="mb-4 flex justify-end">
        <SearchForm defaultValue={q} placeholder="Nummer, Titel, Adresse …" />
      </div>
      <MeasurementList q={q?.slice(0, 80)} />
    </>
  );
}
