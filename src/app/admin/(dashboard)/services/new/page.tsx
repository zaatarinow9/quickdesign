import { createService } from "@/app/actions/service";
import ServiceEditorForm from "@/components/admin/ServiceEditorForm";
import { requireAdminPermission } from "@/lib/admin/auth";

export default async function NewService() {
  await requireAdminPermission("canManageServices");

  return (
    <div className="mx-auto w-full max-w-7xl">
      <ServiceEditorForm mode="create" action={createService} />
    </div>
  );
}
