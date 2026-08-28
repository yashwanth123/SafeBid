import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { useAuth, Me } from "../lib/auth";
import { colors } from "../theme";

export function RegisterScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { setSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: Me }>(
        "/api/auth/register",
        {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify({ name, email, password, inviteCode }),
        },
      );
      await setSession(data.accessToken, data.refreshToken, data.user);
    } catch (e) {
      Alert.alert("Could not register", e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 32, fontWeight: "700", color: colors.forest }}>Just the essentials.</Text>
      <TextInput placeholder="Full name" value={name} onChangeText={setName} style={field} />
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
        placeholder="Password (8+ characters)"
        value={password}
        onChangeText={setPassword}
        style={field}
      />
      <TextInput placeholder="Invite code" value={inviteCode} onChangeText={setInviteCode} style={field} />
      <Pressable onPress={submit} disabled={busy} style={btn}>
        <Text style={{ color: "white", fontWeight: "600" }}>{busy ? "Creating…" : "Create account"}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.sage }}>I already live here</Text>
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
