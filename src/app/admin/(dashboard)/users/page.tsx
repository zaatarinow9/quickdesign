import { format } from "date-fns";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { toggleAdminUserActive } from "@/app/actions/admin-users";
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
      <section className="rounded-[32px] border border-white/70 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 border-b border-slate-100 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600">
              Admin Benutzerverwaltung
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Team und Berechtigungen
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Nur Super Admins duerfen interne Benutzer erstellen, Rollen aendern,
              Passwoerter zuruecksetzen und Zugriffe aktivieren oder deaktivieren.
            </p>
          </div>

          <Link
            href="/admin/users/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            Benutzer anlegen
          </Link>
        </div>

        {(successMessage || errorMessage) && (
          <div
            className={`mt-6 rounded-3xl border px-5 py-4 text-sm font-medium ${
              errorMessage
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {errorMessage ?? successMessage}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Gesamt
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {users.length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Aktiv
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-700">
              {users.filter((user) => user.isActive).length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Super Admins
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-rose-700">
              {
                users.filter(
                  (user) => user.isActive && user.role === "SUPER_ADMIN",
                ).length
              }
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <Users className="h-5 w-5 text-slate-500" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-950">
              Benutzerliste
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Rollen, Status und letzte Pflege im Ueberblick.
            </p>
          </div>
        </div>

        {sortedUsers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">
              Noch keine Admin-Benutzer vorhanden.
            </p>
            <Link
              href="/admin/users/new"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
            >
              <UserPlus className="h-4 w-4" />
              Ersten Benutzer anlegen
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Benutzer
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Rolle
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Angelegt
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Aktualisiert
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedUsers.map((user) => {
                  const toggleActiveAction = toggleAdminUserActive.bind(
                    null,
                    user.id,
                  );
                  const displayNameMatchesUsername =
                    user.name.trim().toLowerCase() ===
                    user.username.trim().toLowerCase();

                  return (
                    <tr key={user.id} className="align-top">
                      <td className="px-6 py-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-slate-950">
                                {user.username}
                              </p>
                              {currentUser.id === user.id && (
                                <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-700">
                                  Sie
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-slate-500">
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
                          className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${getAdminRoleBadgeClassName(
                            user.role,
                          )}`}
                        >
                          {getAdminRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${getAdminStatusBadgeClassName(
                            user.isActive,
                          )}`}
                        >
                          {getAdminStatusLabel(user.isActive)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {format(new Date(user.createdAt), "dd.MM.yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {format(new Date(user.updatedAt), "dd.MM.yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/admin/users/${user.id}/edit`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
                          >
                            Bearbeiten
                          </Link>
                          <Link
                            href={`/admin/users/${user.id}/edit#password-reset`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
                          >
                            Passwort zuruecksetzen
                          </Link>
                          <form action={toggleActiveAction}>
                            <input
                              type="hidden"
                              name="returnTo"
                              value="/admin/users"
                            />
                            <input
                              type="hidden"
                              name="nextIsActive"
                              value={user.isActive ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className={`inline-flex items-center rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] transition-colors ${
                                user.isActive
                                  ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
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
      </section>
    </div>
  );
}
