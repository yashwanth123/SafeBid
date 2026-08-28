import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { colors } from "./src/theme";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { ServicesScreen } from "./src/screens/ServicesScreen";
import { ServiceDetailScreen } from "./src/screens/ServiceDetailScreen";
import { BookingsScreen } from "./src/screens/BookingsScreen";
import { BookingDetailScreen } from "./src/screens/BookingDetailScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

const AuthStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const ServiceStack = createNativeStackNavigator();
const JobStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function ServiceNav() {
  return (
    <ServiceStack.Navigator screenOptions={{ headerTintColor: colors.forest }}>
      <ServiceStack.Screen name="ServiceHome" component={ServicesScreen} options={{ headerShown: false }} />
      <ServiceStack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: "Service" }} />
      <ServiceStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Job" }} />
    </ServiceStack.Navigator>
  );
}

function JobNav() {
  return (
    <JobStack.Navigator screenOptions={{ headerTintColor: colors.forest }}>
      <JobStack.Screen name="JobHome" component={BookingsScreen} options={{ headerShown: false }} />
      <JobStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Job" }} />
    </JobStack.Navigator>
  );
}

function ProfileNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerTintColor: colors.forest }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: "Location" }} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="Feed" component={FeedScreen} />
      <Tabs.Screen name="Services" component={ServiceNav} />
      <Tabs.Screen name="Jobs" component={JobNav} />
      <Tabs.Screen name="Profile" component={ProfileNav} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.forest} />
      </View>
    );
  }
  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      ) : !user.latitude ? (
        <OnboardingScreen />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
