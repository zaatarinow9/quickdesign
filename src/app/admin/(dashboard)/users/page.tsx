import { format } from "date-fns";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { toggleAdminUserActive } from "@/app/actions/admin-users";
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminStatCard,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { requireAdminPermission, requireAdminUser } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import {
  getAdminRoleBadgeClassName,
  getAdminRoleLabel,
  getAdminStatusBadgeClassName,
  getAdminStatusLabel,
  getAdminUsersErrorMessage,
  getAdminUsersSuccessMessage,
} from "@/lib/admin/users";

const ROLE_SORT_ORDER: Record<string, number> = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  STAFF: 2,
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  await requireAdminPermission("canManageUsers");
  const currentUser = await requireAdminUser();
  const params = searchParams ? await searchParams : {};
  const successMessage = getAdminUsersSuccessMessage(params.success);
  const errorMessage = getAdminUsersErrorMessage(params.error);
  const users = await prisma.adminUser.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const sortedUsers = [...users].sort((leftUser, rightUser) => {
    const roleDifference =
      (ROLE_SORT_ORDER[leftUser.role] ?? 99) - (ROLE_SORT_ORDER[rightUser.role] ?? 99);

    if (roleDifference !== 0) {
      return roleDifference;
    }

    return leftUser.username.localeCompare(rightUser.username);
  });

  return (
    <div className="space-y-8">
      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Admin Benutzerverwaltung"
          title="Team und Berechtigungen"
          description="Nur Super Admins duerfen interne Benutzer erstellen, Rollen aendern, Passwoerter zuruecksetzen und Zugriffe aktivieren oder deaktivieren."
          actions={
            <Link href="/admin/users/new" className={getAdminButtonClassName("primary")}>
              <UserPlus className="h-4 w-4" />
              Benutzer anlegen
            </Link>
          }
        />

        {(successMessage || errorMessage) && (
          <div
            className={`mt-6 rounded-3xl border px-5 py-4 text-sm font-medium ${
              errorMessage
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
            }`}
          >
            {errorMessage ?? successMessage}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <AdminStatCard label="Gesamt" value={users.length} tone="slate" />
          <AdminStatCard
            label="Aktiv"
            value={users.filter((user) => user.isActive).length}
            tone="emerald"
          />
          <AdminStatCard
            label="Super Admins"
            value={
              users.filter(
                (user) => user.isActive && user.role === "SUPER_ADMIN",
              ).length
            }
            tone="rose"
          />
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <Users className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
              Benutzerliste
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Rollen, Status und letzte Pflege im Ueberblick.
            </p>
          </div>
        </div>

        {sortedUsers.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              icon={Users}
              title="Noch keine Admin-Benutzer vorhanden."
              description="Legen Sie den ersten internen Benutzer direkt aus dem Dashboard an."
              action={
                <Link href="/admin/users/new" className={getAdminButtonClassName("secondary")}>
                  <UserPlus className="h-4 w-4" />
                  Ersten Benutzer anlegen
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Benutzer
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Rolle
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Angelegt
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Aktualisiert
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedUsers.map((user) => {
                  const toggleActiveAction = toggleAdminUserActive.bind(null, user.id);
                  const displayNameMatchesUsername =
                    user.name.trim().toLowerCase() ===
                    user.username.trim().toLowerCase();

                  return (
                    <tr
                      key={user.id}
                      className="align-top transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-950/50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                                {user.username}
                              </p>
                              {currentUser.id === user.id && (
                                <AdminBadge tone="blue">Sie</AdminBadge>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-300">
                              {!displayNameMatchesUsername && <p>{user.name}</p>}
                              <p>{user.email ?? "Keine E-Mail hinterlegt"}</p>
                            </div>
                          </div>
                          {user.role === "SUPER_ADMIN" && (
                            <ShieldCheck className="h-5 w-5 text-rose-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${getAdminRoleBadgeClassName(
                            user.role,
                          )}`}
                        >
                          {getAdminRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${getAdminStatusBadgeClassName(
                            user.isActive,
                          )}`}
                        >
                          {getAdminStatusLabel(user.isActive)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-300">
                        {format(new Date(user.createdAt), "dd.MM.yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-300">
                        {format(new Date(user.updatedAt), "dd.MM.yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/admin/users/${user.id}/edit`}
                            className={getAdminButtonClassName("secondary")}
                          >
                            Bearbeiten
                          </Link>
                          <Link
                            href={`/admin/users/${user.id}/edit#password-reset`}
                            className={getAdminButtonClassName("secondary")}
                          >
                            Passwort zuruecksetzen
                          </Link>
                          <form action={toggleActiveAction}>
                            <input type="hidden" name="returnTo" value="/admin/users" />
                            <input
                              type="hidden"
                              name="nextIsActive"
                              value={user.isActive ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className={
                                user.isActive
                                  ? getAdminButtonClassName("danger")
                                  : getAdminButtonClassName("primary")
                              }
                            >
                              {user.isActive ? "Deaktivieren" : "Aktivieren"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
