import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/actions/auth";
import LogoMark from "@/components/layout/LogoMark";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { getCurrentAdminUser } from "@/lib/admin/auth";

function getLoginErrorMessage(errorCode: string | undefined): string | null {
  switch (errorCode) {
    case "config":
      return "Admin-Sitzungen sind aktuell nicht korrekt konfiguriert. Bitte ADMIN_SESSION_SECRET prüfen.";
    case "inactive":
      return "Dieser Benutzer ist deaktiviert.";
    case "invalid":
    default:
      return errorCode ? "Benutzername oder Passwort ist falsch." : null;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
  }>;
}) {
  const currentUser = await getCurrentAdminUser();

  if (currentUser) {
    redirect("/admin");
  }

  const params = searchParams ? await searchParams : {};
  const errorMessage = getLoginErrorMessage(params.error);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fafc_38%,#f8fafc_100%)] p-4 sm:p-6 dark:bg-[radial-gradient(circle_at_top_left,#1e293b_0%,#020617_42%,#020617_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <div className="grid w-full overflow-hidden rounded-[36px] border border-white/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_30px_80px_rgba(2,6,23,0.45)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden bg-[radial-gradient(circle_at_top_left,#1d4ed8_0%,#0f172a_55%,#020617_100%)] p-10 text-white lg:block">
            <p className="text-sm font-medium text-sky-200">
              Admin Login
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">
              Sicherer Zugriff auf Aufträge, Leistungen und Team.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-slate-200">
              Verwenden Sie ausschließlich Ihren internen Admin-Zugang. Inaktive
              Benutzer werden automatisch blockiert.
            </p>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="flex items-center justify-between gap-4">
                <LogoMark href="/" size="compact" className="lg:hidden" />
                <p className="hidden text-sm font-medium text-slate-400 dark:text-slate-500 sm:block">
                  Admin Login
                </p>
                <ThemeToggle />
              </div>
              <h2 className="mt-8 text-3xl font-semibold text-slate-950 dark:text-slate-50">
                Willkommen zurück
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300">
                Melden Sie sich mit Benutzername oder E-Mail-Adresse an.
              </p>

              {errorMessage ? (
                <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/50 dark:text-rose-200">
                  {errorMessage}
                </div>
              ) : null}

              <form action={loginAdmin} className="mt-8 space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Benutzername oder E-Mail
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    autoComplete="username"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Passwort
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition-colors focus:border-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  Anmelden
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
