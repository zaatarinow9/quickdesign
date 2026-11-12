import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Neuer Kunde" };

export default async function NewCustomerPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/kunden" className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> Kunden
          </Link>
        }
        title="Neuer Kunde"
      />
      <Card>
        <CustomerForm />
      </Card>
    </>
  );
}
