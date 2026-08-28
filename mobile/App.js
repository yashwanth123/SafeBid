import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

const Tab = createBottomTabNavigator();
const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

function Screen({ title, body }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F1E7" }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#1B4332" }}>{title}</Text>
        <Text style={{ marginTop: 12, fontSize: 16, lineHeight: 22, color: "#14201A" }}>{body}</Text>
        <Text style={{ marginTop: 24, fontSize: 12, color: "#40916C" }}>API {API}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#1B4332",
        }}
      >
        <Tab.Screen name="Feed">
          {() => (
            <Screen
              title="On the block"
              body="The mobile client talks to the same SafeBid API as the web app. Wire auth tokens from login into Authorization headers to load the geo feed."
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Services">
          {() => (
            <Screen
              title="Hire nearby"
              body="GET /api/services with lat/lng. Bookings POST /api/bookings then POST /api/payments/bookings/:id/intent for escrow."
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Messages">
          {() => <Screen title="Messages" body="Socket.io event message:new plus REST /api/messages." />}
        </Tab.Screen>
        <Tab.Screen name="Profile">
          {() => (
            <Screen
              title="You"
              body="ID verification lives at POST /api/identity/session. Wallet at GET /api/payments/wallet."
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
