import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getMeasurement } from "@/lib/measure/server";
import { MeasurementEditor } from "@/components/admin/measure/MeasurementEditor";

export const metadata = { title: "Aufmaß" };

export default async function MeasurementPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getMeasurement(id);
  if (!data) notFound();
  return <MeasurementEditor m={data.m} customer={data.customer} items={data.items} />;
}
