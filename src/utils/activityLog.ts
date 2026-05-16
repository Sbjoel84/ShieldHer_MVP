import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@shieldher_activity_log_v1';
const MAX_ENTRIES = 100;

export type LogType = 'sos' | 'checkin' | 'journey' | 'fakecall' | 'unsafe_area';

export interface LogEntry {
  id: string;
  type: LogType;
  title: string;
  detail: string;
  timestamp: number;
}

export async function appendLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const existing: LogEntry[] = raw ? JSON.parse(raw) : [];
    const newEntry: LogEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function readLog(): Promise<LogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
