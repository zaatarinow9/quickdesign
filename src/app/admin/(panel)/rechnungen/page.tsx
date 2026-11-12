import { DocumentListPage } from "@/components/admin/documents/DocumentListPage";

export const metadata = { title: "Rechnungen" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <DocumentListPage kind="rechnung" searchParams={await searchParams} />;
}
