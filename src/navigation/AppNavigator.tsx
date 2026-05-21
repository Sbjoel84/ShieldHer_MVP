import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { EmergencyContactsScreen } from '../screens/EmergencyContactsScreen';
import { JourneyTrackingScreen } from '../screens/JourneyTrackingScreen';
import { EvidenceRecordingScreen } from '../screens/EvidenceRecordingScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTheme } from '../theme';
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
  VolumeButtonScreen,
  PowerButtonScreen,
  VoiceSafeWordScreen,
  BiometricScreen,
} from '../screens';


const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { outline: string; filled: string }> = {
  Home:    { outline: 'home-outline',         filled: 'home' },
  Alerts:  { outline: 'bell-outline',         filled: 'bell' },
  Journey: { outline: 'walk',                 filled: 'walk' },
  Circle:  { outline: 'account-group-outline', filled: 'account-group' },
  Profile: { outline: 'account-outline',      filled: 'account' },
};

function AppTabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          height: 64 + insets.bottom,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: insets.bottom + 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Journey') {
            return (
              <View style={{
                width: 46,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? '#EDE9FE' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialCommunityIcons name="walk" color={focused ? '#7C3AED' : '#9CA3AF'} size={22} />
              </View>
            );
          }
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
        name="Journey"
        component={JourneyTrackingScreen}
        options={{ tabBarLabel: 'Journey' }}
      />
      <Tab.Screen
        name="Circle"
        component={EmergencyContactsScreen}
        options={{ tabBarLabel: 'Contacts' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { colors } = useTheme();
  const drawerHeaderStyle = {
    headerStyle: { backgroundColor: '#3B0764' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
  };
  return (
    <Drawer.Navigator
        screenOptions={{
          drawerActiveTintColor: '#7C3AED',
          drawerInactiveTintColor: colors.text,
          drawerActiveBackgroundColor: '#EDE9FE',
          drawerItemStyle: { borderRadius: 12, marginHorizontal: 8, marginVertical: 2 },
          drawerLabelStyle: { fontWeight: '600', fontSize: 15 },
          drawerStyle: { width: 280, backgroundColor: colors.drawerBg },
          ...drawerHeaderStyle,
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
          name="Biometric Monitor"
          component={BiometricScreen}
          options={{
            headerShown: false,
            drawerLabel: 'Biometric AI Monitor',
            drawerIcon: ({ color }) => (
              <MaterialCommunityIcons name="heart-pulse" size={22} color={color} />
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

        {/* Detail screens — hidden from drawer menu */}
        <Drawer.Screen
          name="Volume Button"
          component={VolumeButtonScreen}
          options={{
            title: 'Volume Button Pattern',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="Power Button"
          component={PowerButtonScreen}
          options={{
            title: 'Power Button SOS',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="Voice Safe-Word"
          component={VoiceSafeWordScreen}
          options={{
            title: 'Voice Safe-Word',
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { onboardingDone, loaded } = useAppSettings();
  const { colors, isDark } = useTheme();

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background, card: colors.card, border: colors.cardBorder, text: colors.text } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, card: colors.card, border: colors.cardBorder, text: colors.text } };

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!onboardingDone) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <MainApp />
    </NavigationContainer>
  );
}
