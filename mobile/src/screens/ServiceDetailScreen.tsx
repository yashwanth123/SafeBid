import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { colors, money } from "../theme";

type Service = { id: string; title: string; description: string; priceCents: number };

export function ServiceDetailScreen({
  route,
  navigation,
}: {
  route: { params: { id: string } };
  navigation: { navigate: (s: string, p: object) => void };
}) {
  const [service, setService] = useState<Service | null>(null);
  const [when, setWhen] = useState("");

  useEffect(() => {
    api<{ service: Service }>(`/api/services/${route.params.id}`).then((d) => setService(d.service));
  }, [route.params.id]);

  async function book() {
    if (!when) return Alert.alert("Pick a time", "Use YYYY-MM-DDTHH:mm");
    try {
      const scheduledAt = new Date(when).toISOString();
      const booking = await api<{ booking: { id: string } }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({ serviceId: route.params.id, scheduledAt }),
      });
      await api(`/api/payments/bookings/${booking.booking.id}/intent`, { method: "POST" });
      navigation.navigate("BookingDetail", { id: booking.booking.id });
    } catch (e) {
      Alert.alert("Booking failed", e instanceof Error ? e.message : "Try again");
    }
  }

  if (!service) return null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.forest }}>{service.title}</Text>
      <Text style={{ marginTop: 12, lineHeight: 22 }}>{service.description}</Text>
      <Text style={{ marginTop: 16, fontSize: 22, fontWeight: "700" }}>{money(service.priceCents)}</Text>
      <TextInput
        placeholder="2026-09-01T10:00"
        value={when}
        onChangeText={setWhen}
        style={{
          marginTop: 16,
          backgroundColor: "white",
          borderRadius: 16,
          padding: 14,
        }}
      />
      <Pressable
        onPress={book}
        style={{
          marginTop: 16,
          backgroundColor: colors.forest,
          borderRadius: 24,
          padding: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Pay into escrow</Text>
      </Pressable>
    </ScrollView>
  );
}
