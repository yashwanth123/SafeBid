import { Alert, Pressable, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../theme";

export function ProfileScreen({ navigation }: { navigation: { navigate: (s: string) => void } }) {
  const { user, logout, refreshUser } = useAuth();

  async function verify() {
    try {
      await api("/api/identity/session", { method: "POST" });
      await api("/api/identity/mock/complete", {
        method: "POST",
        body: JSON.stringify({ outcome: "verified" }),
      });
      await refreshUser();
      Alert.alert("Verified", "You can list services now (demo ID).");
    } catch (e) {
      Alert.alert("Verification", e instanceof Error ? e.message : "Try again");
    }
  }

  if (!user) return null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 24, paddingTop: 64 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.forest }}>{user.name}</Text>
      <Text style={{ marginTop: 6, color: colors.muted }}>
        {user.email} · {user.verificationStatus}
      </Text>
      <Pressable onPress={verify} style={btn}>
        <Text style={{ color: "white", fontWeight: "600" }}>Verify ID (demo)</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("Onboarding")} style={[btn, { backgroundColor: colors.sage }]}>
        <Text style={{ color: "white", fontWeight: "600" }}>Update location</Text>
      </Pressable>
      <Pressable onPress={logout} style={[btn, { backgroundColor: colors.clay }]}>
        <Text style={{ color: "white", fontWeight: "600" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const btn = {
  marginTop: 14,
  backgroundColor: colors.forest,
  borderRadius: 24,
  padding: 14,
  alignItems: "center" as const,
};
