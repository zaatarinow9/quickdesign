import { format } from "date-fns";
import { ArrowLeft, KeyRound, Save, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  resetAdminUserPassword,
  updateAdminUserProfile,
} from "@/app/actions/admin-users";
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600">
            Admin Benutzerverwaltung
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Benutzer bearbeiten
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold text-slate-950">
              {user.username}
            </span>
            {currentUser.id === user.id && (
              <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-700">
                Sie
              </span>
            )}
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${getAdminRoleBadgeClassName(
                user.role,
              )}`}
            >
              {getAdminRoleLabel(user.role)}
            </span>
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${getAdminStatusBadgeClassName(
                user.isActive,
              )}`}
            >
              {getAdminStatusLabel(user.isActive)}
            </span>
            {user.role === "SUPER_ADMIN" && (
              <ShieldCheck className="h-4 w-4 text-rose-500" />
            )}
          </div>
        </div>

        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Zur Benutzerliste
        </Link>
      </div>

      {(successMessage || errorMessage) && (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm font-medium ${
            errorMessage
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {errorMessage ?? successMessage}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="rounded-[32px] border border-white/70 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <UserCog className="h-5 w-5 text-slate-500" />
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-950">
              Profildaten
            </h2>
          </div>

          <form action={updateProfileAction} className="mt-6 space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                  Benutzername
                </label>
                <input
                  name="username"
                  required
                  defaultValue={user.username}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
                />
              </div>
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                  Anzeigename
                </label>
                <input
                  name="name"
                  defaultValue={user.name}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                  E-Mail
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ""}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
                />
              </div>
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                  Rolle
                </label>
                <select
                  name="role"
                  defaultValue={user.role}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
                >
                  {ADMIN_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={user.isActive}
                className="h-4 w-4 accent-slate-950"
              />
              Benutzer ist aktiv
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-slate-800"
            >
              <Save className="h-4 w-4" />
              Profil speichern
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <section
            id="password-reset"
            className="rounded-[32px] border border-white/70 bg-white p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <KeyRound className="h-5 w-5 text-slate-500" />
              <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-950">
                Passwort zuruecksetzen
              </h2>
            </div>

            <form action={resetPasswordAction} className="mt-6 space-y-6">
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                  Neues Passwort
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={MIN_ADMIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Mindestens {MIN_ADMIN_PASSWORD_LENGTH} Zeichen, mindestens ein
                  Buchstabe und eine Zahl.
                </p>
              </div>

              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                  Passwort bestaetigen
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={MIN_ADMIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
              >
                Passwort aktualisieren
              </button>
            </form>
          </section>

          <section className="rounded-[32px] border border-white/70 bg-white p-8 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Zeitstempel
            </p>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-bold text-slate-950">Angelegt</p>
                <p>{format(new Date(user.createdAt), "dd.MM.yyyy HH:mm")}</p>
              </div>
              <div>
                <p className="font-bold text-slate-950">Zuletzt aktualisiert</p>
                <p>{format(new Date(user.updatedAt), "dd.MM.yyyy HH:mm")}</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
