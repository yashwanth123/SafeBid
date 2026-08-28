import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";
import { colors, money } from "../theme";

type Service = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  category: string;
  provider: { name: string; verificationStatus: string };
};

export function ServicesScreen({ navigation }: { navigation: { navigate: (s: string, p: object) => void } }) {
  const [services, setServices] = useState<Service[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api<{ services: Service[] }>("/api/services");
      setServices(data.services);
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
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.forest }}>Hire nearby</Text>
      {services.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => navigation.navigate("ServiceDetail", { id: s.id })}
          style={{ marginTop: 14, backgroundColor: "white", borderRadius: 20, padding: 16 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600" }}>{s.title}</Text>
          <Text style={{ marginTop: 6, color: colors.muted }} numberOfLines={2}>
            {s.description}
          </Text>
          <Text style={{ marginTop: 10, color: colors.forest, fontWeight: "600" }}>
            {money(s.priceCents)} · {s.provider.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
