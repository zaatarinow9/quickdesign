import { NewDocumentPage } from "@/components/admin/documents/NewDocumentPage";

export const metadata = { title: "Neu" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <NewDocumentPage kind="angebot" searchParams={await searchParams} />;
}
