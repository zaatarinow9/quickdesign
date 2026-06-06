import { format } from "date-fns";
import { ArrowLeft, KeyRound, Save, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  resetAdminUserPassword,
  updateAdminUserProfile,
} from "@/app/actions/admin-users";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionCard,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { requireAdminPermission, requireAdminUser } from "@/lib/admin/auth";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_ROLE_OPTIONS,
  getAdminRoleBadgeClassName,
  getAdminRoleLabel,
  getAdminStatusBadgeClassName,
  getAdminStatusLabel,
  getAdminUsersErrorMessage,
  getAdminUsersSuccessMessage,
} from "@/lib/admin/users";

export default async function EditAdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  await requireAdminPermission("canManageUsers");
  const currentUser = await requireAdminUser();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const successMessage = getAdminUsersSuccessMessage(query.success);
  const errorMessage = getAdminUsersErrorMessage(query.error);
  const user = await prisma.adminUser.findUnique({
    where: { id },
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

  if (!user) {
    redirect("/admin/users?error=notFound");
  }

  const updateProfileAction = updateAdminUserProfile.bind(null, user.id);
  const resetPasswordAction = resetAdminUserPassword.bind(null, user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Admin Benutzerverwaltung"
          title="Benutzer bearbeiten"
          description={
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                {user.username}
              </span>
              {currentUser.id === user.id && (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
                  Sie
                </span>
              )}
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${getAdminRoleBadgeClassName(
                  user.role,
                )}`}
              >
                {getAdminRoleLabel(user.role)}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${getAdminStatusBadgeClassName(
                  user.isActive,
                )}`}
              >
                {getAdminStatusLabel(user.isActive)}
              </span>
              {user.role === "SUPER_ADMIN" && (
                <ShieldCheck className="h-4 w-4 text-rose-500" />
              )}
            </div>
          }
          actions={
            <Link href="/admin/users" className={getAdminButtonClassName("secondary")}>
              <ArrowLeft className="h-4 w-4" />
              Zur Benutzerliste
            </Link>
          }
        />
      </AdminCard>

      {(successMessage || errorMessage) && (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm font-medium ${
            errorMessage
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
          }`}
        >
          {errorMessage ?? successMessage}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <AdminSectionCard
          title="Profildaten"
          description="Benutzername, Anzeigename, Rolle und Aktivstatus koennen hier aktualisiert werden."
          icon={UserCog}
        >
          <form action={updateProfileAction} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                  Benutzername
                </label>
                <input
                  name="username"
                  required
                  defaultValue={user.username}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                />
              </div>
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                  Anzeigename
                </label>
                <input
                  name="name"
                  defaultValue={user.name}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                  E-Mail
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ""}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                />
              </div>
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                  Rolle
                </label>
                <select
                  name="role"
                  defaultValue={user.role}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                >
                  {ADMIN_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={user.isActive}
                className="h-4 w-4 accent-slate-950 dark:accent-slate-100"
              />
              Benutzer ist aktiv
            </label>

            <button type="submit" className={getAdminButtonClassName("primary")}>
              <Save className="h-4 w-4" />
              Profil speichern
            </button>
          </form>
        </AdminSectionCard>

        <div className="space-y-6">
          <AdminSectionCard
            title="Passwort zuruecksetzen"
            description="Das neue Passwort wird direkt fuer diesen Benutzer gespeichert."
            icon={KeyRound}
            className="scroll-mt-24"
          >
            <form id="password-reset" action={resetPasswordAction} className="space-y-6">
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                  Neues Passwort
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={MIN_ADMIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                />
                <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-300">
                  Mindestens {MIN_ADMIN_PASSWORD_LENGTH} Zeichen, mindestens ein
                  Buchstabe und eine Zahl.
                </p>
              </div>

              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                  Passwort bestaetigen
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={MIN_ADMIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                />
              </div>

              <button type="submit" className={getAdminButtonClassName("secondary")}>
                Passwort aktualisieren
              </button>
            </form>
          </AdminSectionCard>

          <AdminCard className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Zeitstempel
            </p>
            <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-950 dark:text-slate-50">Angelegt</p>
                <p>{format(new Date(user.createdAt), "dd.MM.yyyy HH:mm")}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  Zuletzt aktualisiert
                </p>
                <p>{format(new Date(user.updatedAt), "dd.MM.yyyy HH:mm")}</p>
              </div>
            </div>
          </AdminCard>
        </div>
      </section>
    </div>
  );
}
