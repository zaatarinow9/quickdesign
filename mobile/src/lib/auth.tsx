import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, onAuthProblem } from "./api";
import { supabase } from "./supabase";
import { unregisterPush } from "./push";
import { DEMO } from "./demo";

export type Me = { email: string; name: string | null; role: "owner" | "admin" | "manager"; full: boolean };

type State =
  | { status: "loading" }
  | { status: "signedOut"; notice?: string }
  | { status: "mfa"; factorId: string }
  | { status: "ready"; me: Me; unread: number };

type Ctx = {
  state: State;
  signIn: (email: string, password: string) => Promise<"ok" | "mfa" | "wrong" | "network">;
  verify: (code: string) => Promise<boolean>;
  signOut: (notice?: string) => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const loadMe = useCallback(async () => {
    try {
      const r = await api<{ user: Me; unread: number }>("/me");
      setState({ status: "ready", me: r.user, unread: r.unread });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "network";
      if (code === "mfa_required") {
        const sb = await supabase();
        const { data } = await sb.auth.mfa.listFactors();
        const f = data?.totp?.find((x) => x.status === "verified");
        if (f) return setState({ status: "mfa", factorId: f.id });
      }
      if (code === "network") {
        // offline: angemeldet bleiben, später erneut versuchen
        setState((s) => (s.status === "ready" ? s : { status: "signedOut", notice: "network" }));
        return;
      }
      const sb = await supabase();
      await sb.auth.signOut();
      setState({ status: "signedOut", notice: code });
    }
  }, []);

  // Sitzung beim Start prüfen
  useEffect(() => {
    if (DEMO) {
      void loadMe();
      return;
    }
    (async () => {
      try {
        const sb = await supabase();
        const { data } = await sb.auth.getSession();
        if (!data.session) return setState({ status: "signedOut" });
        const aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal.data?.nextLevel === "aal2" && aal.data.currentLevel !== "aal2") {
          const { data: f } = await sb.auth.mfa.listFactors();
          const factor = f?.totp?.find((x) => x.status === "verified");
          if (factor) return setState({ status: "mfa", factorId: factor.id });
        }
        await loadMe();
      } catch {
        setState({ status: "signedOut", notice: "network" });
      }
    })();
  }, [loadMe]);

  const signOut = useCallback(async (notice?: string) => {
    await unregisterPush().catch(() => {});
    const sb = await supabase();
    await sb.auth.signOut().catch(() => {});
    setState({ status: "signedOut", notice });
  }, []);

  // Rechte entzogen / Sitzung ungültig → zurück zur Anmeldung
  useEffect(
    () =>
      onAuthProblem((code) => {
        if (code === "mfa_required") void loadMe();
        else void signOut(code);
      }),
    [loadMe, signOut],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      signIn: async (email, password) => {
        try {
          const sb = await supabase();
          const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
          if (error) return error.message.toLowerCase().includes("fetch") ? "network" : "wrong";
          const aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aal.data?.nextLevel === "aal2" && aal.data.currentLevel !== "aal2") {
            const { data: f } = await sb.auth.mfa.listFactors();
            const factor = f?.totp?.find((x) => x.status === "verified");
            if (factor) {
              setState({ status: "mfa", factorId: factor.id });
              return "mfa";
            }
          }
          await loadMe();
          return "ok";
        } catch {
          return "network";
        }
      },
      verify: async (code) => {
        if (state.status !== "mfa") return false;
        const sb = await supabase();
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: state.factorId, code: code.trim() });
        if (error) return false;
        await loadMe();
        return true;
      },
      signOut,
      refreshMe: loadMe,
    }),
    [state, loadMe, signOut],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

export function useMe(): Me {
  const { state } = useAuth();
  if (state.status !== "ready") throw new Error("not ready");
  return state.me;
}
