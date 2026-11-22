import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { brand, useColors } from "@/lib/theme";
import { Button, Field, haptic, Icon, Txt } from "./ui";

function Shell({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const { rtl, lang, setLang } = useT();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, direction: rtl ? "rtl" : "ltr" }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Pressable onPress={() => setLang(lang === "de" ? "ar" : "de")} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: c.card }}>
            <Icon name="language" size={16} color={c.text} />
            <Txt v="label">{lang === "de" ? "العربية" : "Deutsch"}</Txt>
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: "center", paddingVertical: 24 }}>
          <View style={{ alignItems: "center", marginBottom: 32, gap: 16 }}>
            <Image source={require("@/assets/images/icon.png")} style={{ width: 88, height: 88, borderRadius: 24 }} />
            <View style={{ flexDirection: "row", gap: 5 }}>
              {[brand.cyan, brand.magenta, brand.yellow, brand.ink].map((col) => <View key={col} style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: col }} />)}
            </View>
          </View>
          {children}
        </View>
        <Txt v="caption" color={c.text3} center>QuickDesign · Saarbrücken</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function LoginScreen({ notice }: { notice?: string }) {
  const { t } = useT();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(notice === "mfa_enroll" ? t.login.enroll : notice === "no_access" ? t.common.noAccess : notice === "network" ? t.common.network : null);

  const submit = async () => {
    if (!email || !password) return;
    setBusy(true);
    setError(null);
    const r = await signIn(email, password);
    setBusy(false);
    if (r === "wrong") {
      haptic.error();
      setError(t.login.wrong);
    } else if (r === "network") setError(t.common.network);
  };

  return (
    <Shell>
      <Txt v="display" center>{t.login.title}</Txt>
      <Txt v="body" center style={{ marginTop: 6, marginBottom: 28, opacity: 0.6 }}>{t.login.subtitle}</Txt>
      <View style={{ gap: 12 }}>
        <Field value={email} onChangeText={setEmail} placeholder={t.login.email} keyboard="email-address" />
        <Field value={password} onChangeText={setPassword} placeholder={t.login.password} secure />
      </View>
      {error ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: `${brand.red}12` }}>
          <Icon name="alert-circle" size={18} color={brand.red} />
          <Txt v="meta" color={brand.red} style={{ flex: 1 }}>{error}</Txt>
        </View>
      ) : null}
      <Button label={t.login.submit} onPress={submit} loading={busy} disabled={!email || !password} style={{ marginTop: 20 }} />
    </Shell>
  );
}

export function MfaScreen() {
  const { t } = useT();
  const { verify, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    const ok = await verify(value);
    setBusy(false);
    if (!ok) {
      haptic.error();
      setError(true);
      setCode("");
    }
  };

  return (
    <Shell>
      <Txt v="display" center>{t.login.mfaTitle}</Txt>
      <Txt v="body" center style={{ marginTop: 6, marginBottom: 28, opacity: 0.6 }}>{t.login.mfaText}</Txt>
      <Field
        value={code}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, "").slice(0, 6);
          setCode(digits);
          setError(false);
          if (digits.length === 6) void submit(digits);
        }}
        placeholder="000000"
        keyboard="number-pad"
        autoFocus
        style={{ textAlign: "center", fontSize: 30, letterSpacing: 12, height: 68 }}
      />
      {error ? <Txt v="meta" color={brand.red} center style={{ marginTop: 12 }}>{t.login.mfaWrong}</Txt> : null}
      <Button label={t.login.verify} onPress={() => submit()} loading={busy} disabled={code.length !== 6} style={{ marginTop: 20 }} />
      <Button label={t.login.logout} onPress={() => signOut()} kind="plain" style={{ marginTop: 4 }} />
    </Shell>
  );
}
