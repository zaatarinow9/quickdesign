import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { NewMeasurementForm } from "@/components/admin/measure/NewMeasurementForm";

export const metadata = { title: "Neues Aufmaß" };

export default async function NewMeasurementPage({ searchParams }: { searchParams: Promise<{ kunde?: string }> }) {
  await requireAdmin();
  const { kunde } = await searchParams;
  const { data } = await db().from("customers").select("id, name, company_name, customer_number, street, postal_code, city").order("updated_at", { ascending: false }).limit(1000);
  const customers = (data ?? []).map((c) => ({
    id: c.id as string,
    label: ((c.company_name as string) || (c.name as string) || "").trim(),
    sub: [c.company_name ? c.name : null, c.customer_number, c.city].filter(Boolean).join(" · "),
    address: [c.street, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
  }));
  return (
    <>
      <PageHeader title="Neues Aufmaß" description="Kunde wählen (oder schnell neu anlegen) – danach Positionen mit Foto und Maßen erfassen." />
      <NewMeasurementForm customers={customers} preselect={kunde} />
    </>
  );
}
