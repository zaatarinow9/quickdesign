import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic";
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
  const [fonts] = useFonts({ IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold });
  useEffect(() => {
    if (state.status !== "loading" && ready && fonts) void SplashScreen.hideAsync();
  }, [state.status, ready, fonts]);
  if (state.status === "loading" || !ready || !fonts)
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
