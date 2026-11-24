import { Platform } from "react-native";
import Constants from "expo-constants";
import { API_URL } from "./config";

/** Fehler an den Server melden (ohne persönliche Daten) */
export function reportError(e: unknown, where: string) {
  const err = e instanceof Error ? e : new Error(String(e));
  void fetch(`${API_URL}/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: err.message, stack: err.stack, where, build: Constants.nativeBuildVersion ?? "", os: `${Platform.OS} ${Platform.Version}` }),
  }).catch(() => {});
}

/** JS-Fehler außerhalb des Renderns: melden statt die App zu beenden */
export function installErrorHandler() {
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu || __DEV__) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    reportError(e, fatal ? "global-fatal" : "global");
    // nicht als „fatal" weitergeben – sonst beendet iOS die App
    prev(e, false);
  });
}
