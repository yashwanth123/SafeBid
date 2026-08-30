import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors, money } from "../theme";

type Booking = {
  id: string;
  status: string;
  priceCents: number;
  customer: { id: string; name: string };
  provider: { id: string; name: string };
  service: { title: string };
  payment: { status: string } | null;
};

export function BookingDetailScreen({ route }: { route: { params: { id: string } } }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ booking: Booking }>(`/api/bookings/${route.params.id}`);
    setBooking(data.booking);
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function act(path: string, payload?: object) {
    try {
      await api(`/api/bookings/${route.params.id}/${path}`, {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      });
      load();
    } catch (e) {
      Alert.alert("Could not update", e instanceof Error ? e.message : "Try again");
    }
  }

  if (!booking) return null;
  const isProvider = user?.id === booking.provider.id;
  const isCustomer = user?.id === booking.customer.id;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.forest }}>{booking.service.title}</Text>
      <Text style={{ marginTop: 8 }}>
        {booking.status} · {money(booking.priceCents)} · payment {booking.payment?.status}
      </Text>
      {isProvider && booking.status === "CREATED" && booking.payment?.status === "ESCROWED" && (
        <Action label="Confirm job" onPress={() => act("confirm")} />
      )}
      {isProvider && booking.status === "CONFIRMED" && <Action label="Start job" onPress={() => act("start")} />}
      {isProvider && booking.status === "IN_PROGRESS" && (
        <Action label="Mark complete" onPress={() => act("complete")} />
      )}
      {isCustomer && booking.status === "COMPLETED" && (
        <Action label="Review 5★ and release escrow" onPress={() => act("review", { rating: 5 })} />
      )}
    </ScrollView>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginTop: 16,
        backgroundColor: colors.forest,
        borderRadius: 24,
        padding: 14,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
