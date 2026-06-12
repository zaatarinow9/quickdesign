import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomer } from "@/app/actions/customer";
import CustomerForm from "@/components/admin/CustomerForm";
import { requireAdminPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  await requireAdminPermission("canManageCustomers");
  const { id } = await params;
  const pageParams = searchParams ? await searchParams : {};
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    return notFound();
  }

  const updateCustomerWithId = updateCustomer.bind(null, customer.id);

  return (
    <div className="space-y-8">
      <Link
        href={`/admin/customers/${customer.id}`}
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:text-neutral-950"
      >
        <ArrowLeft className="h-3 w-3" /> Zurück zum Profil
      </Link>

      <div className="border-b border-neutral-100 pb-8">
        <h1 className="flex items-center gap-4 text-4xl font-bold uppercase tracking-tighter">
          <Pencil className="h-10 w-10" /> Kunde bearbeiten
        </h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
          Stammdaten, Rechnungsbasis und Notizen aktualisieren
        </p>
      </div>

      {pageParams.error === "invalid" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Bitte pruefen Sie mindestens den Ansprechpartner.
        </div>
      )}
      {pageParams.error === "email" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Diese E-Mail-Adresse ist bereits einem anderen Kunden zugeordnet.
        </div>
      )}

      <CustomerForm
        action={updateCustomerWithId}
        initialValues={customer}
        submitLabel="Aenderungen speichern"
      />
    </div>
  );
}
