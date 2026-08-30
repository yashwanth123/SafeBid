import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { useAuth, Me } from "../lib/auth";
import { colors } from "../theme";

export function LoginScreen({ navigation }: { navigation: { navigate: (s: string) => void } }) {
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: Me }>(
        "/api/auth/login",
        { method: "POST", skipAuth: true, body: JSON.stringify({ email, password }) },
      );
      await setSession(data.accessToken, data.refreshToken, data.user);
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 32, fontWeight: "700", color: colors.forest }}>Come inside.</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={field}
      />
      <TextInput
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={field}
      />
      <Pressable onPress={submit} disabled={busy} style={btn}>
        <Text style={{ color: "white", fontWeight: "600" }}>{busy ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("Register")} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.sage }}>Need an invite? Create an account</Text>
      </Pressable>
    </View>
  );
}

const field = {
  marginTop: 12,
  backgroundColor: "white",
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: "#D8F3DC",
};
const btn = {
  marginTop: 16,
  backgroundColor: colors.forest,
  borderRadius: 24,
  padding: 14,
  alignItems: "center" as const,
};
