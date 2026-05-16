import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHILD_MODE_KEY = '@shieldher_child_mode_v1';
const ONBOARDING_KEY = '@shieldher_onboarding_done_v1';

interface AppSettingsContextType {
  childMode: boolean;
  setChildMode: (v: boolean) => Promise<void>;
  onboardingDone: boolean;
  markOnboardingDone: () => Promise<void>;
  loaded: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [childMode, setChildModeState] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CHILD_MODE_KEY),
      AsyncStorage.getItem(ONBOARDING_KEY),
    ])
      .then(([cm, od]) => {
        if (cm === 'true') setChildModeState(true);
        if (od === 'true') setOnboardingDone(true);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function setChildMode(v: boolean) {
    setChildModeState(v);
    await AsyncStorage.setItem(CHILD_MODE_KEY, v ? 'true' : 'false');
  }

  async function markOnboardingDone() {
    setOnboardingDone(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }

  return (
    <AppSettingsContext.Provider
      value={{ childMode, setChildMode, onboardingDone, markOnboardingDone, loaded }}
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
