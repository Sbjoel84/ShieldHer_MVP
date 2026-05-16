import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { EmergencyContactsScreen } from '../screens/EmergencyContactsScreen';
import { JourneyTrackingScreen } from '../screens/JourneyTrackingScreen';
import { EvidenceRecordingScreen } from '../screens/EvidenceRecordingScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  AlertsScreen,
  ProfileScreen,
  SafetyPlanScreen,
  ActivityLogScreen,
  SettingsScreen,
  HelpCenterScreen,
  CheckInTimerScreen,
  SafetyTipsScreen,
  UnsafeAreaScreen,
  TriggerMethodsScreen,
} from '../screens';


const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { outline: string; filled: string }> = {
  Home:    { outline: 'home-outline',         filled: 'home' },
  Alerts:  { outline: 'bell-outline',         filled: 'bell' },
  Circle:  { outline: 'account-group-outline', filled: 'account-group' },
  Profile: { outline: 'account-outline',      filled: 'account' },
};

function AppTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          height: 62,
          borderTopColor: '#EDE9FE',
          borderTopWidth: 1,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = TAB_ICONS[route.name];
          const name = focused ? icons?.filled : icons?.outline;
          return (
            <MaterialCommunityIcons name={(name ?? 'circle-outline') as any} color={color} size={size} />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen
        name="Circle"
        component={EmergencyContactsScreen}
        options={{ tabBarLabel: 'My Circle' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const DRAWER_HEADER_STYLE = {
  headerStyle: { backgroundColor: '#3B0764' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
};

function MainApp() {
  return (
    <Drawer.Navigator
        screenOptions={{
          drawerActiveTintColor: '#7C3AED',
          drawerInactiveTintColor: '#1b1c1c',
          drawerActiveBackgroundColor: '#EDE9FE',
          drawerItemStyle: { borderRadius: 12, marginHorizontal: 8, marginVertical: 2 },
          drawerLabelStyle: { fontWeight: '600', fontSize: 15 },
          drawerStyle: { width: 280, backgroundColor: '#F9F5FF' },
          ...DRAWER_HEADER_STYLE,
        }}
      >
        {/* Main app (bottom tabs) */}
        <Drawer.Screen
          name="App"
          component={AppTabNavigator}
          options={{
            headerShown: false,
            drawerLabel: 'Home',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="home-outline" size={22} color={color} />
            ),
          }}
        />

        {/* Screens with their own custom headers — hide navigation header */}
        <Drawer.Screen
          name="Emergency Contacts"
          component={EmergencyContactsScreen}
          options={{
            headerShown: false,
            drawerLabel: 'Trusted Circle',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="account-group" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Journey Tracking"
          component={JourneyTrackingScreen}
          options={{
            headerShown: false,
            drawerLabel: 'Safe Walk',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="walk" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Check-In Timer"
          component={CheckInTimerScreen}
          options={{
            headerShown: false,
            drawerLabel: 'Check-In Timer',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="timer-outline" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Evidence Recording"
          component={EvidenceRecordingScreen}
          options={{
            headerShown: false,
            drawerLabel: 'Evidence Recording',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="microphone-outline" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Safety Tips"
          component={SafetyTipsScreen}
          options={{
            headerShown: false,
            drawerLabel: 'Safety Guide',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Unsafe Areas"
          component={UnsafeAreaScreen}
          options={{
            headerShown: false,
            drawerLabel: 'Unsafe Area Map',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="map-marker-alert-outline" size={22} color={color} />
            ),
          }}
        />

        {/* Screens using the themed navigation header */}
        <Drawer.Screen
          name="Trigger Methods"
          component={TriggerMethodsScreen}
          options={{
            title: 'Hidden Triggers',
            drawerLabel: 'Hidden Triggers',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="bell-ring-outline" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Safety Plan"
          component={SafetyPlanScreen}
          options={{
            title: 'My Safety Plan',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="shield-check-outline" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Activity Log"
          component={ActivityLogScreen}
          options={{
            title: 'Activity Log',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="history" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="cog-outline" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Help Center"
          component={HelpCenterScreen}
          options={{
            title: 'Help Center',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="help-circle-outline" size={22} color={color} />
            ),
          }}
        />
      </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { onboardingDone, loaded } = useAppSettings();

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9F5FF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!onboardingDone) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer>
      <MainApp />
    </NavigationContainer>
  );
}
