import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin/auth";
import { hasAdminPermission } from "@/lib/admin/permissions";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ forbidden?: string }>;
}) {
  const currentUser = await requireAdminUser();
  const params = searchParams ? await searchParams : {};
  const servicesCount = hasAdminPermission(currentUser, "canManageServices")
    ? await prisma.service.count()
    : null;
  const openOrdersCount = await prisma.order.count({
    where: {
      status: {
        notIn: ["DELIVERED", "CANCELED"],
      },
    },
  });
  const assignedToMeCount = await prisma.order.count({
    where: { assignedToId: currentUser.id },
  });
  const unassignedOrdersCount = await prisma.order.count({
    where: { assignedToId: null },
  });

  return (
    <div className="w-full space-y-10">
      {params.forbidden && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Sie haben fuer diesen Bereich keine Berechtigung.
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tighter text-neutral-950">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Willkommen, {currentUser.name}. Ihre Rolle: {currentUser.role}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="flex flex-col justify-center border border-neutral-200 bg-white p-8 shadow-sm">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Offene Bestellungen
          </h3>
          <p className="text-5xl font-bold text-neutral-950">
            {openOrdersCount}
          </p>
        </div>

        <div className="flex flex-col justify-center border border-neutral-200 bg-white p-8 shadow-sm">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Mir zugewiesen
          </h3>
          <p className="text-5xl font-bold text-neutral-950">
            {assignedToMeCount}
          </p>
        </div>

        <div className="flex flex-col justify-center border border-neutral-200 bg-white p-8 shadow-sm">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Nicht zugewiesen
          </h3>
          <p className="text-5xl font-bold text-neutral-950">
            {unassignedOrdersCount}
          </p>
        </div>

        {servicesCount !== null && (
          <div className="flex flex-col justify-center border border-neutral-200 bg-white p-8 shadow-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
              Aktive Leistungen
            </h3>
            <p className="text-5xl font-bold text-neutral-950">
              {servicesCount}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
