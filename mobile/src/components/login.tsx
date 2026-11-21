import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { brand, useColors } from "@/lib/theme";
import { Button, Field, haptic, T } from "./ui";

function Shell({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const { rtl, lang, setLang } = useT();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, direction: rtl ? "rtl" : "ltr" }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 28, gap: 14 }}>
          <Image source={require("@/assets/images/icon.png")} style={{ width: 84, height: 84, borderRadius: 20 }} />
          {/* CMYK-Streifen wie im Logo */}
          <View style={{ flexDirection: "row", gap: 5 }}>
            {[brand.cyan, brand.magenta, brand.yellow, brand.ink].map((col) => (
              <View key={col} style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: col }} />
            ))}
          </View>
        </View>
        {children}
        <Pressable onPress={() => setLang(lang === "de" ? "ar" : "de")} style={{ alignSelf: "center", marginTop: 26, padding: 8 }}>
          <Text style={{ color: brand.magenta, fontSize: 15 }}>{lang === "de" ? "العربية" : "Deutsch"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function LoginScreen({ notice }: { notice?: string }) {
  const { t } = useT();
  const c = useColors();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    notice === "mfa_enroll" ? t.login.enroll : notice === "no_access" ? t.common.noAccess : notice === "network" ? t.common.network : null,
  );

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
      <T size={30} weight="700" style={{ textAlign: "center" }}>{t.login.title}</T>
      <T size={15} color={c.text2} style={{ textAlign: "center", marginTop: 6, marginBottom: 24 }}>{t.login.subtitle}</T>
      <View style={{ backgroundColor: c.card, borderRadius: 14, overflow: "hidden" }}>
        <Field value={email} onChangeText={setEmail} placeholder={t.login.email} keyboard="email-address" />
        <View style={{ height: 0.5, backgroundColor: c.line as string, marginStart: 16 }} />
        <Field value={password} onChangeText={setPassword} placeholder={t.login.password} secure />
      </View>
      {error ? <T size={14} color={brand.red} style={{ marginTop: 12, textAlign: "center" }}>{error}</T> : null}
      <Button label={t.login.submit} onPress={submit} loading={busy} disabled={!email || !password} style={{ marginTop: 20 }} />
    </Shell>
  );
}

export function MfaScreen() {
  const { t } = useT();
  const c = useColors();
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
      <T size={28} weight="700" style={{ textAlign: "center" }}>{t.login.mfaTitle}</T>
      <T size={15} color={c.text2} style={{ textAlign: "center", marginTop: 6, marginBottom: 24 }}>{t.login.mfaText}</T>
      <View style={{ backgroundColor: c.card, borderRadius: 14 }}>
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
          style={{ textAlign: "center", fontSize: 28, letterSpacing: 10, fontVariant: ["tabular-nums"] }}
        />
      </View>
      {error ? <T size={14} color={brand.red} style={{ marginTop: 12, textAlign: "center" }}>{t.login.mfaWrong}</T> : null}
      <Button label={t.login.verify} onPress={() => submit()} loading={busy} disabled={code.length !== 6} style={{ marginTop: 20 }} />
      <Button label={t.login.logout} onPress={() => signOut()} kind="plain" style={{ marginTop: 6 }} />
    </Shell>
  );
}
