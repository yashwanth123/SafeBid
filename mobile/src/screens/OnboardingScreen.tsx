import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../theme";

export function OnboardingScreen() {
  const { refreshUser, user } = useAuth();
  const [city, setCity] = useState(user?.city ?? "");
  const [lat, setLat] = useState(String(user?.latitude ?? "30.2672"));
  const [lng, setLng] = useState(String(user?.longitude ?? "-97.7431"));
  const [busy, setBusy] = useState(false);

  async function pinHere() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Location needed", "Type a city or allow location to see your block.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(String(pos.coords.latitude));
    setLng(String(pos.coords.longitude));
  }

  async function save() {
    setBusy(true);
    try {
      await api("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          city,
          latitude: Number(lat),
          longitude: Number(lng),
          radiusKm: 6,
        }),
      });
      await refreshUser();
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 32, fontWeight: "700", color: colors.forest }}>Where should we look?</Text>
      <TextInput placeholder="City" value={city} onChangeText={setCity} style={field} />
      <Pressable onPress={pinHere} style={[btn, { backgroundColor: colors.sage }]}>
        <Text style={{ color: "white", fontWeight: "600" }}>Use my current location</Text>
      </Pressable>
      <Pressable onPress={save} disabled={busy} style={btn}>
        <Text style={{ color: "white", fontWeight: "600" }}>{busy ? "Saving…" : "Show me the block"}</Text>
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
