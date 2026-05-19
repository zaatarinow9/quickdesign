import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { createCustomer } from "@/app/actions/customer";
import CustomerForm from "@/components/admin/CustomerForm";
import { requireAdminPermission } from "@/lib/admin/auth";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  await requireAdminPermission("canManageCustomers");
  const params = searchParams ? await searchParams : {};

  return (
    <div className="space-y-8">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:text-neutral-950"
      >
        <ArrowLeft className="h-3 w-3" /> Zurueck zu Kunden
      </Link>

      <div className="border-b border-neutral-100 pb-8">
        <h1 className="flex items-center gap-4 text-4xl font-bold uppercase tracking-tighter">
          <UserPlus className="h-10 w-10" /> Neuer Kunde
        </h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
          Neues Kundenprofil fuer die interne Auftragsverwaltung anlegen
        </p>
      </div>

      {params.error === "invalid" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Bitte pruefen Sie mindestens den Ansprechpartner.
        </div>
      )}
      {params.error === "email" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Diese E-Mail-Adresse ist bereits einem anderen Kunden zugeordnet.
        </div>
      )}

      <CustomerForm action={createCustomer} submitLabel="Kunde speichern" />
    </div>
  );
}
