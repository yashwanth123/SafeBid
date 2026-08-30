import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";
import { colors, money } from "../theme";

type Booking = {
  id: string;
  status: string;
  priceCents: number;
  scheduledAt: string;
  service: { title: string };
};

export function BookingsScreen({ navigation }: { navigation: { navigate: (s: string, p: object) => void } }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api<{ bookings: Booking[] }>("/api/bookings");
      setBookings(data.bookings);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 16, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.forest }}>Jobs</Text>
      {bookings.map((b) => (
        <Pressable
          key={b.id}
          onPress={() => navigation.navigate("BookingDetail", { id: b.id })}
          style={{ marginTop: 14, backgroundColor: "white", borderRadius: 20, padding: 16 }}
        >
          <Text style={{ fontWeight: "600" }}>{b.service.title}</Text>
          <Text style={{ marginTop: 6, color: colors.muted }}>
            {b.status} · {money(b.priceCents)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
