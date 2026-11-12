import { DocumentDetailPage } from "@/components/admin/documents/DocumentDetailPage";

export const metadata = { title: "Rechnungen" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <DocumentDetailPage kind="rechnung" id={id} isNew={!!sp.neu} />;
}
