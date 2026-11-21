/** Basis-Adresse der QuickDesign-Website (API der Mitarbeiter-App) */
export const SITE_URL = "https://www.quickdesign24.de";
export const API_URL = `${SITE_URL}/api/app`;

export type RemoteConfig = { supabaseUrl: string; supabaseKey: string; minBuild: number };

let cached: RemoteConfig | null = null;

/** Öffentliche Startwerte (Supabase-URL + Publishable Key) von der Website holen */
export async function remoteConfig(): Promise<RemoteConfig> {
  if (cached) return cached;
  const res = await fetch(`${API_URL}/config`);
  if (!res.ok) throw new Error("config");
  cached = (await res.json()) as RemoteConfig;
  return cached;
}
