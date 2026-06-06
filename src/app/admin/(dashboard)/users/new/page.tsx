import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { createAdminUser } from "@/app/actions/admin-users";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionCard,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { requireAdminPermission } from "@/lib/admin/auth";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import {
  ADMIN_ROLE_OPTIONS,
  getAdminUsersErrorMessage,
} from "@/lib/admin/users";

export default async function NewAdminUserPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
  }>;
}) {
  await requireAdminPermission("canManageUsers");
  const params = searchParams ? await searchParams : {};
  const errorMessage = getAdminUsersErrorMessage(params.error);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Admin Benutzerverwaltung"
          title="Benutzer anlegen"
          description="Legen Sie hier einen neuen Admin- oder Staff-Zugang mit sicherem Passwort an."
          actions={
            <Link href="/admin/users" className={getAdminButtonClassName("secondary")}>
              <ArrowLeft className="h-4 w-4" />
              Zur Benutzerliste
            </Link>
          }
        />
      </AdminCard>

      <AdminSectionCard
        title="Neuer Benutzer"
        description="Benutzername, Rolle und Aktivstatus koennen direkt beim Anlegen festgelegt werden."
        icon={UserPlus}
      >
        {errorMessage && (
          <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
            {errorMessage}
          </div>
        )}

        <form action={createAdminUser} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                Benutzername
              </label>
              <input
                name="username"
                required
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                Anzeigename
              </label>
              <input
                name="name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-300">
                Optional. Wenn leer, wird der Benutzername verwendet.
              </p>
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
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                Rolle
              </label>
              <select
                name="role"
                defaultValue="STAFF"
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

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
                Passwort
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
          </div>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="h-4 w-4 accent-slate-950 dark:accent-slate-100"
            />
            Benutzer sofort aktivieren
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className={getAdminButtonClassName("primary")}>
              Benutzer speichern
            </button>
            <Link href="/admin/users" className={getAdminButtonClassName("secondary")}>
              Abbrechen
            </Link>
          </div>
        </form>
      </AdminSectionCard>
    </div>
  );
}
