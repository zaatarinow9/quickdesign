import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { api } from "./api";
import { prefs } from "./storage";

export const CATEGORIES = ["anfrage", "shop", "datei", "projekt", "dokument"] as const;

// Hinweise auch im Vordergrund als Banner zeigen
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

let currentToken: string | null = null;

/** Push-Erlaubnis holen und Gerät bei der API anmelden */
export async function registerPush(lang: "de" | "ar", categories?: string[]): Promise<"ok" | "denied" | "unsupported"> {
  if (!Device.isDevice) return "unsupported";
  if (Platform.OS === "android") {
    // eslint-disable-next-line import/namespace -- Enum ist vorhanden (Typprüfung ok)
    await Notifications.setNotificationChannelAsync("default", { name: "QuickDesign", importance: Notifications.AndroidImportance.HIGH, sound: "default" });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return "denied";
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  currentToken = token;
  await prefs.set("pushToken", token);
  await api("/devices", { method: "POST", body: { token, platform: Platform.OS, lang, ...(categories ? { categories } : {}) } });
  return "ok";
}

export async function pushToken(): Promise<string | null> {
  return currentToken ?? (await prefs.get("pushToken"));
}

export async function unregisterPush() {
  const token = await pushToken();
  if (token) await api("/devices", { method: "DELETE", body: { token } }).catch(() => {});
  currentToken = null;
}

/** Link aus der Benachrichtigung → Bildschirm in der App */
export function routeFor(link: string | null | undefined): string | null {
  if (!link) return null;
  const m = link.match(/^\/(inquiries|shop|files|projects|documents|appointments|tasks)\/([0-9a-f-]{36})$/i);
  if (!m) return null;
  const [, kind, id] = m;
  if (kind === "inquiries") return `/inquiries/${id}`;
  if (kind === "projects") return `/work/${id}`;
  if (kind === "appointments") return `/work/termin/${id}`;
  if (kind === "tasks") return null;
  if (kind === "files") return `/files/${id}`;
  if (kind === "shop") return `/more/shop/${id}`;
  return `/more/documents/${id}`;
}

/** Tippen auf eine Benachrichtigung öffnet das passende Element */
export function listenForTaps() {
  const go = (r: Notifications.NotificationResponse | null) => {
    const link = (r?.notification.request.content.data as { link?: string } | undefined)?.link;
    const to = routeFor(link);
    if (to) setTimeout(() => router.push(to as never), 50);
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) go(last);
  const sub = Notifications.addNotificationResponseReceivedListener(go);
  return () => sub.remove();
}
