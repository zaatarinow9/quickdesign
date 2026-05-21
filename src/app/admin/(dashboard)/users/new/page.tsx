import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { createAdminUser } from "@/app/actions/admin-users";
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600">
            Admin Benutzerverwaltung
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Benutzer anlegen
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Legen Sie hier einen neuen Admin- oder Staff-Zugang mit sicherem
            Passwort an.
          </p>
        </div>

        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Zur Benutzerliste
        </Link>
      </div>

      <section className="rounded-[32px] border border-white/70 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <UserPlus className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-950">
            Neuer Benutzer
          </h2>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <form action={createAdminUser} className="mt-6 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                Benutzername
              </label>
              <input
                name="username"
                required
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
              />
            </div>
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                Anzeigename
              </label>
              <input
                name="name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
              />
              <p className="mt-2 text-xs text-slate-500">
                Optional. Wenn leer, wird der Benutzername verwendet.
              </p>
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
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950"
              />
            </div>
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                Rolle
              </label>
              <select
                name="role"
                defaultValue="STAFF"
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

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                Passwort
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
          </div>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="h-4 w-4 accent-slate-950"
            />
            Benutzer sofort aktivieren
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-slate-800"
            >
              Benutzer speichern
            </button>
            <Link
              href="/admin/users"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
