import { FileViewScreen } from "@/components/admin/files/FileViewScreen";

export const metadata = { title: "Datei ansehen" };

export default async function FileViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FileViewScreen id={id} />;
}
