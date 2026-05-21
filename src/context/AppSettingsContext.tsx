import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHILD_MODE_KEY = '@shieldher_child_mode_v1';
const ONBOARDING_KEY = '@shieldher_onboarding_done_v1';
const DARK_MODE_KEY  = '@shieldher_dark_mode_v1';

interface AppSettingsContextType {
  childMode: boolean;
  setChildMode: (v: boolean) => Promise<void>;
  darkMode: boolean;
  setDarkMode: (v: boolean) => Promise<void>;
  onboardingDone: boolean;
  markOnboardingDone: () => Promise<void>;
  loaded: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [childMode, setChildModeState] = useState(false);
  const [darkMode, setDarkModeState] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CHILD_MODE_KEY),
      AsyncStorage.getItem(ONBOARDING_KEY),
      AsyncStorage.getItem(DARK_MODE_KEY),
    ])
      .then(([cm, od, dm]) => {
        if (cm === 'true') setChildModeState(true);
        if (od === 'true') setOnboardingDone(true);
        if (dm === 'false') setDarkModeState(false);
        else if (dm === 'true') setDarkModeState(true);
        // if dm === null (first launch), keep default true
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function setChildMode(v: boolean) {
    setChildModeState(v);
    await AsyncStorage.setItem(CHILD_MODE_KEY, v ? 'true' : 'false');
  }

  async function setDarkMode(v: boolean) {
    setDarkModeState(v);
    await AsyncStorage.setItem(DARK_MODE_KEY, v ? 'true' : 'false');
  }

  async function markOnboardingDone() {
    setOnboardingDone(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }

  return (
    <AppSettingsContext.Provider
      value={{ childMode, setChildMode, darkMode, setDarkMode, onboardingDone, markOnboardingDone, loaded }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used inside AppSettingsProvider');
  return ctx;
}
