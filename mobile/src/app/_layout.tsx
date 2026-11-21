import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LangProvider, useT } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { listenForTaps, registerPush } from "@/lib/push";
import { useColors } from "@/lib/theme";
import { DEMO } from "@/lib/demo";
import { LoginScreen, MfaScreen } from "@/components/login";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LangProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <Gate />
        </AuthProvider>
      </LangProvider>
    </GestureHandlerRootView>
  );
}

function Gate() {
  const { state } = useAuth();
  const { ready } = useT();
  const c = useColors();
  useEffect(() => {
    if (state.status !== "loading" && ready) void SplashScreen.hideAsync();
  }, [state.status, ready]);
  if (state.status === "loading" || !ready)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <ActivityIndicator />
      </View>
    );
  if (state.status === "signedOut") return <LoginScreen notice={state.notice} />;
  if (state.status === "mfa") return <MfaScreen />;
  return <SignedIn />;
}

function SignedIn() {
  const { lang } = useT();
  // Push anmelden (bei Sprachwechsel neu, damit die Texte passen) und Tippen auf Hinweise verarbeiten
  useEffect(() => {
    if (!DEMO) void registerPush(lang).catch(() => {});
  }, [lang]);
  useEffect(() => (DEMO ? undefined : listenForTaps()), []);
  return <Stack screenOptions={{ headerShown: false }} />;
}
