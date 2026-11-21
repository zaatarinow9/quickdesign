import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { remoteConfig } from "./config";
import { secureStorage } from "./storage";

let client: SupabaseClient | null = null;
let pending: Promise<SupabaseClient> | null = null;

/** Supabase-Client (nur für die Anmeldung – Daten kommen über die geschützte API) */
export function supabase(): Promise<SupabaseClient> {
  if (client) return Promise.resolve(client);
  pending ??= remoteConfig().then((cfg) => {
    client = createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    // Token nur im Vordergrund erneuern
    AppState.addEventListener("change", (s) => {
      if (s === "active") client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
    return client;
  });
  return pending.catch((e) => {
    pending = null;
    throw e;
  });
}

export async function accessToken(): Promise<string | null> {
  const sb = await supabase();
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}
