import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";
import { colors } from "../theme";

type Post = {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  likeCount: number;
  author: { name: string };
};

export function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api<{ posts: Post[] }>("/api/posts");
      setPosts(data.posts);
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
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.forest }}>On the block</Text>
      {posts.map((p) => (
        <View
          key={p.id}
          style={{
            marginTop: 14,
            backgroundColor: "white",
            borderRadius: 20,
            padding: 16,
          }}
        >
          <Text style={{ fontWeight: "600" }}>{p.author.name}</Text>
          <Text style={{ marginTop: 4, color: colors.muted, fontSize: 12 }}>{p.category}</Text>
          <Text style={{ marginTop: 8, lineHeight: 20 }}>{p.content}</Text>
          <Pressable
            onPress={() => api(`/api/posts/${p.id}/like`, { method: "POST" }).then(load)}
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: colors.clay }}>{p.likeCount} likes</Text>
          </Pressable>
        </View>
      ))}
      {posts.length === 0 && !refreshing && (
        <Text style={{ marginTop: 24, color: colors.muted }}>Quiet so far. Pull to refresh.</Text>
      )}
    </ScrollView>
  );
}
