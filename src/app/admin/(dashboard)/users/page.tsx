import { format } from "date-fns";
import { UserPlus, Users } from "lucide-react";
import { createAdminUser, updateAdminUser } from "@/app/actions/admin-users";
import { requireAdminPermission } from "@/lib/admin/auth";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { prisma } from "@/lib/prisma";

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Staff" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
}) {
  await requireAdminPermission("canManageUsers");
  const params = searchParams ? await searchParams : {};
  const users = await prisma.adminUser.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-8">
        <div>
          <h1 className="flex items-center gap-4 text-4xl font-bold uppercase tracking-tighter">
            <Users className="h-10 w-10" /> Team & Berechtigungen
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
            Interne Benutzer, Rollen und aktive Zugriffe verwalten
          </p>
        </div>
      </div>

      {params.created && (
        <div className="border border-green-100 bg-green-50 p-4 text-xs font-bold uppercase tracking-widest text-green-700">
          Benutzer wurde angelegt.
        </div>
      )}
      {params.updated && (
        <div className="border border-green-100 bg-green-50 p-4 text-xs font-bold uppercase tracking-widest text-green-700">
          Benutzer wurde aktualisiert.
        </div>
      )}
      {params.error === "self" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Der eigene Super-Admin-Zugriff kann nicht deaktiviert oder herabgestuft werden.
        </div>
      )}
      {params.error === "invalid" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Bitte pruefen Sie Name und Benutzername.
        </div>
      )}
      {params.error === "weak" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Bitte verwenden Sie ein staerkeres Passwort mit mindestens {MIN_ADMIN_PASSWORD_LENGTH} Zeichen sowie Buchstaben und Zahlen.
        </div>
      )}
      {params.error === "email" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Bitte geben Sie eine gueltige E-Mail-Adresse ein.
        </div>
      )}
      {params.error === "duplicate" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Benutzername oder E-Mail-Adresse ist bereits vergeben.
        </div>
      )}
      {params.error === "lastSuper" && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Mindestens ein aktiver Super-Admin muss erhalten bleiben.
        </div>
      )}

      <form
        action={createAdminUser}
        className="space-y-8 border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-5">
          <UserPlus className="h-5 w-5" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
            Neuen Benutzer anlegen
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
              Name
            </label>
            <input
              name="name"
              required
              className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
          </div>
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
              Benutzername
            </label>
            <input
              name="username"
              required
              className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
          </div>
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
              E-Mail optional
            </label>
            <input
              name="email"
              type="email"
              className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
              Passwort
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={MIN_ADMIN_PASSWORD_LENGTH}
              className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
            <p className="mt-2 text-[11px] text-neutral-500">
              Mindestens {MIN_ADMIN_PASSWORD_LENGTH} Zeichen, Buchstaben und Zahlen.
            </p>
          </div>
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
              Rolle
            </label>
            <select
              name="role"
              defaultValue="STAFF"
              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex min-h-[54px] items-center gap-4 self-end border border-neutral-200 bg-neutral-50 px-4">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="h-5 w-5 accent-neutral-950"
            />
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-950">
              Aktiv
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="bg-neutral-950 px-8 py-4 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
        >
          Benutzer speichern
        </button>
      </form>

      <div className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Benutzer
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Rolle
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Status
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Angelegt
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Aktualisieren
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.map((user) => {
              const updateUserWithId = updateAdminUser.bind(null, user.id);

              return (
                <tr key={user.id}>
                  <td className="p-5">
                    <form
                      id={`user-${user.id}`}
                      action={updateUserWithId}
                      className="grid gap-3"
                    >
                      <input
                        name="name"
                        defaultValue={user.name}
                        required
                        className="border border-neutral-200 p-3 text-xs font-bold outline-none focus:border-neutral-950"
                      />
                      <input
                        name="username"
                        defaultValue={user.username}
                        required
                        className="border border-neutral-200 p-3 text-xs outline-none focus:border-neutral-950"
                      />
                      <input
                        name="email"
                        type="email"
                        defaultValue={user.email ?? ""}
                        placeholder="E-Mail optional"
                        className="border border-neutral-200 p-3 text-xs outline-none focus:border-neutral-950"
                      />
                      <input
                        name="password"
                        type="password"
                        minLength={MIN_ADMIN_PASSWORD_LENGTH}
                        placeholder="Neues Passwort optional"
                        className="border border-neutral-200 p-3 text-xs outline-none focus:border-neutral-950"
                      />
                    </form>
                  </td>
                  <td className="p-5 align-top">
                    <select
                      name="role"
                      form={`user-${user.id}`}
                      defaultValue={user.role}
                      className="w-full border border-neutral-200 bg-white p-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-neutral-950"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-5 align-top">
                    <label className="inline-flex items-center gap-3 border border-neutral-200 bg-neutral-50 px-4 py-3">
                      <input
                        type="checkbox"
                        name="isActive"
                        form={`user-${user.id}`}
                        defaultChecked={user.isActive}
                        className="h-4 w-4 accent-neutral-950"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Aktiv
                      </span>
                    </label>
                  </td>
                  <td className="p-5 align-top text-xs font-bold uppercase tracking-widest text-neutral-500">
                    {format(new Date(user.createdAt), "dd.MM.yyyy")}
                  </td>
                  <td className="p-5 align-top">
                    <button
                      type="submit"
                      form={`user-${user.id}`}
                      className="bg-neutral-950 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
                    >
                      Speichern
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
