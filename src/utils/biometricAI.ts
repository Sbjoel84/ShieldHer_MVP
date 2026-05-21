import AsyncStorage from '@react-native-async-storage/async-storage';

const BASELINE_KEY = '@shieldher_biometric_v1';
const MIN_READINGS = 20;      // readings before baseline is "learned"
const WINDOW_SIZE = 60;       // rolling window per sensor

export type SensorId = 'heartRate' | 'movement' | 'spO2' | 'bloodPressure' | 'skinTemp' | 'breathingRate';
export type Sensitivity = 'low' | 'medium' | 'high';

// Z-score thresholds: high sensitivity = easier to trigger
const Z_THRESHOLD: Record<Sensitivity, number> = { low: 3.0, medium: 2.5, high: 2.0 };

export interface SensorBaseline {
  readings: number[];         // raw rolling window
  mean: number;
  stdDev: number;
  isLearned: boolean;
  lastAnomalyAt: number | null;
}

export interface BiometricState {
  baselines: Record<SensorId, SensorBaseline>;
  sensitivity: Sensitivity;
}

const DEFAULT_BASELINE: SensorBaseline = {
  readings: [],
  mean: 0,
  stdDev: 0,
  isLearned: false,
  lastAnomalyAt: null,
};

const SENSOR_IDS: SensorId[] = ['heartRate', 'movement', 'spO2', 'bloodPressure', 'skinTemp', 'breathingRate'];

function calcStats(readings: number[]): { mean: number; stdDev: number } {
  if (readings.length === 0) return { mean: 0, stdDev: 0 };
  const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
  const variance = readings.reduce((s, v) => s + (v - mean) ** 2, 0) / readings.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

export async function loadBiometricState(): Promise<BiometricState> {
  try {
    const raw = await AsyncStorage.getItem(BASELINE_KEY);
    if (raw) return JSON.parse(raw) as BiometricState;
  } catch {}
  return {
    baselines: Object.fromEntries(
      SENSOR_IDS.map(id => [id, { ...DEFAULT_BASELINE, readings: [] }])
    ) as Record<SensorId, SensorBaseline>,
    sensitivity: 'medium',
  };
}

export async function saveBiometricState(state: BiometricState): Promise<void> {
  try {
    await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(state));
  } catch {}
}

export interface ReadingResult {
  nextState: BiometricState;
  isAnomaly: boolean;
  zScore: number;
}

export function addReading(
  state: BiometricState,
  id: SensorId,
  value: number,
): ReadingResult {
  const prev = state.baselines[id];
  const readings = [...prev.readings, value].slice(-WINDOW_SIZE);
  const { mean, stdDev } = calcStats(readings);
  const isLearned = readings.length >= MIN_READINGS;

  let isAnomaly = false;
  let zScore = 0;
  if (isLearned && stdDev > 0) {
    zScore = Math.abs((value - mean) / stdDev);
    isAnomaly = zScore > Z_THRESHOLD[state.sensitivity];
  }

  const nextState: BiometricState = {
    ...state,
    baselines: {
      ...state.baselines,
      [id]: {
        readings,
        mean,
        stdDev,
        isLearned,
        lastAnomalyAt: isAnomaly ? Date.now() : prev.lastAnomalyAt,
      },
    },
  };

  return { nextState, isAnomaly, zScore };
}

// Returns 0–1 severity score for a given value vs baseline
export function anomalyScore(state: BiometricState, id: SensorId, value: number): number {
  const b = state.baselines[id];
  if (!b.isLearned || b.stdDev === 0) return 0;
  const z = Math.abs((value - b.mean) / b.stdDev);
  return Math.min(z / 4.0, 1.0);
}

// Returns fraction 0–1 of baseline learning progress
export function baselineProgress(state: BiometricState, id: SensorId): number {
  return Math.min(state.baselines[id].readings.length / MIN_READINGS, 1);
}

// Count sensors with anomaly in the last N ms
export function activeAnomalyCount(state: BiometricState, windowMs = 15000): number {
  const now = Date.now();
  return SENSOR_IDS.filter(id => {
    const last = state.baselines[id].lastAnomalyAt;
    return last !== null && now - last <= windowMs;
  }).length;
}

export async function resetBaseline(state: BiometricState, id?: SensorId): Promise<BiometricState> {
  if (!id) {
    const fresh = await loadBiometricState();
    // keep sensitivity
    fresh.sensitivity = state.sensitivity;
    // reset all baselines
    SENSOR_IDS.forEach(sid => { fresh.baselines[sid] = { ...DEFAULT_BASELINE, readings: [] }; });
    await saveBiometricState(fresh);
    return fresh;
  }
  const next: BiometricState = {
    ...state,
    baselines: {
      ...state.baselines,
      [id]: { ...DEFAULT_BASELINE, readings: [] },
    },
  };
  await saveBiometricState(next);
  return next;
}
