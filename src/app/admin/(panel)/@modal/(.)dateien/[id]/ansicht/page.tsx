import { FileViewScreen } from "@/components/admin/files/FileViewScreen";

/** Schwebender Betrachter über der Dateiliste (Klick außerhalb oder ESC schließt) */
export default async function FileViewModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FileViewScreen id={id} modal />;
}
