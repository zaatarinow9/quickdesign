import { DocumentListPage } from "@/components/admin/documents/DocumentListPage";

export const metadata = { title: "Angebote" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <DocumentListPage kind="angebot" searchParams={await searchParams} />;
}
