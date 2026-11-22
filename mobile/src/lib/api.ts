import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { API_URL } from "./config";
import { accessToken, supabase } from "./supabase";
import { DEMO, demoApi } from "./demo";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

type Listener = (code: string) => void;
const authListeners = new Set<Listener>();
/** Bei 401/403 meldet sich die Oberfläche (z. B. zurück zur Anmeldung) */
export const onAuthProblem = (fn: Listener) => {
  authListeners.add(fn);
  return () => {
    authListeners.delete(fn);
  };
};

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (DEMO) return demoApi(path) as T;
  const call = async (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers: { Accept: "application/json", ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  let res = await call(await accessToken());
  if (res.status === 401) {
    // abgelaufenes Token einmal erneuern
    const sb = await supabase();
    const { data } = await sb.auth.refreshSession();
    if (data.session) res = await call(data.session.access_token);
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    const code = json.error ?? `http_${res.status}`;
    if (["unauthorized", "no_access", "mfa_required", "mfa_enroll"].includes(code)) authListeners.forEach((l) => l(code));
    throw new ApiError(res.status, code);
  }
  return json as T;
}

/** Daten laden + bei Rückkehr auf den Bildschirm still erneuern + „Ziehen zum Aktualisieren“ */
export function useApi<T>(path: string | null, opts: { refocus?: boolean } = { refocus: true }) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "silent") => {
      if (!path) return;
      if (mode === "refresh") setRefreshing(true);
      try {
        const d = await api<T>(path);
        if (alive.current) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (alive.current) setError(e instanceof ApiError ? e.code : "network");
      } finally {
        if (alive.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path],
  );

  useEffect(() => {
    alive.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Ladezustand beim Wechsel der Adresse zurücksetzen
    setLoading(!!path);
    void load("initial");
    return () => {
      alive.current = false;
    };
  }, [load, path]);

  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (opts.refocus !== false) void load("silent");
    }, [load, opts.refocus]),
  );

  return { data, error, loading, refreshing, refresh: () => load("refresh"), reload: () => load("silent"), setData };
}
