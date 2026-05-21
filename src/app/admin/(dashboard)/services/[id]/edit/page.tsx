import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateService } from "@/app/actions/service";
import ServiceEditorForm from "@/components/admin/ServiceEditorForm";
import { requireAdminPermission } from "@/lib/admin/auth";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission("canManageServices");
  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      options: {
        select: { id: true },
      },
    },
  });

  if (!service) return notFound();
  const updateServiceWithId = updateService.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <ServiceEditorForm
        mode="edit"
        action={updateServiceWithId}
        service={service}
        optionCount={service.options.length}
        optionsHref={`/admin/services/${service.id}`}
      />
    </div>
  );
}
