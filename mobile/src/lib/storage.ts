import * as SecureStore from "expo-secure-store";

/**
 * Sicherer Speicher (iOS-Schlüsselbund) für die Anmeldung.
 * Werte über ~2 KB werden in Teile zerlegt.
 */
const CHUNK = 1800;
const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const safe = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "_");

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const k = safe(key);
    const n = await SecureStore.getItemAsync(`${k}.n`, opts);
    if (!n) return SecureStore.getItemAsync(k, opts);
    const parts: string[] = [];
    for (let i = 0; i < Number(n); i++) parts.push((await SecureStore.getItemAsync(`${k}.${i}`, opts)) ?? "");
    return parts.join("");
  },
  async setItem(key: string, value: string): Promise<void> {
    const k = safe(key);
    await this.removeItem(key);
    if (value.length <= CHUNK) return SecureStore.setItemAsync(k, value, opts);
    const count = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < count; i++) await SecureStore.setItemAsync(`${k}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), opts);
    await SecureStore.setItemAsync(`${k}.n`, String(count), opts);
  },
  async removeItem(key: string): Promise<void> {
    const k = safe(key);
    const n = await SecureStore.getItemAsync(`${k}.n`, opts);
    if (n) for (let i = 0; i < Number(n); i++) await SecureStore.deleteItemAsync(`${k}.${i}`, opts);
    await SecureStore.deleteItemAsync(`${k}.n`, opts);
    await SecureStore.deleteItemAsync(k, opts);
  },
};

/** kleine Einstellungen (Sprache …) */
export const prefs = {
  get: (k: string) => SecureStore.getItemAsync(safe(`pref.${k}`), opts),
  set: (k: string, v: string) => SecureStore.setItemAsync(safe(`pref.${k}`), v, opts),
};
