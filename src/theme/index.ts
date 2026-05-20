import { useMemo } from 'react';
import { useAppSettings } from '../context/AppSettingsContext';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  card: string;
  cardBorder: string;
  cardBorderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  divider: string;
  inputBg: string;
  inputBgAlt: string;
  inputBorder: string;
  inputBorderAlt: string;
  switchTrackOff: string;
  switchThumbOff: string;
  tabBarBg: string;
  tabBarBorder: string;
  drawerBg: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  optionBg: string;
  accentText: string;
}

const LIGHT: ThemeColors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F9F5FF',
  backgroundTertiary: '#fcf9f8',
  card: '#FFFFFF',
  cardBorder: '#EDE9FE',
  cardBorderLight: '#F3F4F6',
  text: '#1b1c1c',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  divider: '#F3F4F6',
  inputBg: '#FAFAFA',
  inputBgAlt: '#fcf9f8',
  inputBorder: '#C4B5FD',
  inputBorderAlt: '#cdc3d4',
  switchTrackOff: '#E5E7EB',
  switchThumbOff: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#EDE9FE',
  drawerBg: '#F9F5FF',
  chipBg: '#F3F4F6',
  chipBorder: '#E5E7EB',
  chipText: '#6B7280',
  optionBg: '#F9F5FF',
  accentText: '#310065',
};

const DARK: ThemeColors = {
  background: '#0F0F1A',
  backgroundSecondary: '#13131F',
  backgroundTertiary: '#13131F',
  card: '#1A1A2E',
  cardBorder: '#2D2B45',
  cardBorderLight: '#252435',
  text: '#F1F0F7',
  textSecondary: '#9B98B4',
  textMuted: '#6B6880',
  divider: '#252435',
  inputBg: '#1A1A2E',
  inputBgAlt: '#1A1A2E',
  inputBorder: '#5B4D8F',
  inputBorderAlt: '#3D3B52',
  switchTrackOff: '#3D3B52',
  switchThumbOff: '#9CA3AF',
  tabBarBg: '#13131F',
  tabBarBorder: '#2D2B45',
  drawerBg: '#13131F',
  chipBg: '#2D2B45',
  chipBorder: '#3D3B52',
  chipText: '#9B98B4',
  optionBg: '#13131F',
  accentText: '#E9D5FF',
};

export function useTheme() {
  const { darkMode } = useAppSettings();
  const colors = useMemo(() => (darkMode ? DARK : LIGHT), [darkMode]);
  return { colors, isDark: darkMode };
}
