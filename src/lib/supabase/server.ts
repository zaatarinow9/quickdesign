import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Sitzungs-Cookies: für Skripte unlesbar (HttpOnly), nur über HTTPS, nicht seitenübergreifend */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Supabase-Client für die Admin-Anmeldung (Session über HttpOnly-Cookies). */
export async function supabaseAuth() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // In Server Components nicht möglich – der Proxy aktualisiert die Session.
        }
      },
    },
  });
}
