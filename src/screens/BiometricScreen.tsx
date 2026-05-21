import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Animated,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Accelerometer } from 'expo-sensors';
import { useTheme, ThemeColors } from '../theme';
import { triggerSOS } from '../utils/triggerSOS';
import {
  loadBiometricState,
  saveBiometricState,
  addReading,
  baselineProgress,
  activeAnomalyCount,
  resetBaseline,
  BiometricState,
  SensorId,
  Sensitivity,
} from '../utils/biometricAI';

// ─── Sensor Config ────────────────────────────────────────────────────────────
interface SensorConfig {
  id: SensorId;
  label: string;
  unit: string;
  icon: string;
  accentColor: string;
  bgColor: string;
  normalRange: [number, number] | null;
  isLive: boolean;
  wearableRequired: boolean;
  description: string;
}

const SENSORS: SensorConfig[] = [
  {
    id: 'heartRate',
    label: 'Heart Rate',
    unit: 'bpm',
    icon: 'heart-pulse',
    accentColor: '#DC2626',
    bgColor: '#FEE2E2',
    normalRange: [60, 100],
    isLive: false,
    wearableRequired: false,
    description: 'Normal: 60–100 bpm at rest',
  },
  {
    id: 'movement',
    label: 'Body Movement',
    unit: '',
    icon: 'run',
    accentColor: '#7C3AED',
    bgColor: '#EDE9FE',
    normalRange: null,
    isLive: true,
    wearableRequired: false,
    description: 'Live from accelerometer',
  },
  {
    id: 'spO2',
    label: 'Blood Oxygen',
    unit: '%',
    icon: 'water-percent',
    accentColor: '#0891B2',
    bgColor: '#CFFAFE',
    normalRange: [95, 100],
    isLive: false,
    wearableRequired: false,
    description: 'Normal: 95–100%',
  },
  {
    id: 'breathingRate',
    label: 'Breathing Rate',
    unit: 'br/min',
    icon: 'lungs',
    accentColor: '#0D9488',
    bgColor: '#CCFBF1',
    normalRange: [12, 20],
    isLive: false,
    wearableRequired: false,
    description: 'Normal: 12–20 breaths/min',
  },
  {
    id: 'bloodPressure',
    label: 'Blood Pressure',
    unit: 'mmHg',
    icon: 'heart',
    accentColor: '#BE185D',
    bgColor: '#FCE7F3',
    normalRange: [90, 140],
    isLive: false,
    wearableRequired: true,
    description: 'Systolic. Normal: 90–120 mmHg',
  },
  {
    id: 'skinTemp',
    label: 'Skin Temperature',
    unit: '°C',
    icon: 'thermometer',
    accentColor: '#D97706',
    bgColor: '#FEF3C7',
    normalRange: [34, 38],
    isLive: false,
    wearableRequired: true,
    description: 'Normal: 34–38°C',
  },
];

const SENSITIVITIES: { id: Sensitivity; label: string; desc: string }[] = [
  { id: 'low', label: 'Low', desc: '3× std — fewer alerts' },
  { id: 'medium', label: 'Medium', desc: '2.5× std — balanced' },
  { id: 'high', label: 'High', desc: '2× std — very sensitive' },
];

const SOS_COUNTDOWN_SEC = 12;
const ANOMALY_TRIGGER_COUNT = 2; // sensors anomalous simultaneously to fire SOS

// ─── Component ────────────────────────────────────────────────────────────────
export function BiometricScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [biometricState, setBiometricState] = useState<BiometricState | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [currentValues, setCurrentValues] = useState<Partial<Record<SensorId, number>>>({});
  const [movementLabel, setMovementLabel] = useState<'Still' | 'Walking' | 'Active' | 'Erratic'>('Still');
  const [inputSensor, setInputSensor] = useState<SensorId | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [sosReason, setSosReason] = useState('');

  const accelRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 1 });
  const prevMags = useRef<number[]>([]);
  const accelSub = useRef<{ remove: () => void } | null>(null);
  const movementTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sosTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const anomalyConsec = useRef<Partial<Record<SensorId, number>>>({});
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const stateRef = useRef<BiometricState | null>(null);

  // Keep ref in sync with state (for use inside callbacks)
  useEffect(() => { stateRef.current = biometricState; }, [biometricState]);

  // Load on mount
  useEffect(() => {
    loadBiometricState().then(s => setBiometricState(s));
    return () => stopMonitoring();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pulse animation when monitoring
  useEffect(() => {
    if (monitoring) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [monitoring, pulseAnim]);

  // ── Anomaly check ────────────────────────────────────────────────────────────
  const checkForSOS = useCallback((state: BiometricState, triggeredId: SensorId) => {
    const count = activeAnomalyCount(state, 15000);
    if (count >= ANOMALY_TRIGGER_COUNT && sosCountdown === null) {
      const anomalousLabels = SENSORS
        .filter(s => {
          const last = state.baselines[s.id].lastAnomalyAt;
          return last !== null && Date.now() - last < 15000;
        })
        .map(s => s.label)
        .join(' + ');
      setSosReason(`Abnormal ${anomalousLabels} detected`);
      startSOSCountdown();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosCountdown]);

  // ── Process a sensor reading ─────────────────────────────────────────────────
  const processReading = useCallback((id: SensorId, value: number) => {
    setBiometricState(prev => {
      if (!prev) return prev;
      const { nextState, isAnomaly, zScore } = addReading(prev, id, value);

      if (isAnomaly) {
        anomalyConsec.current[id] = (anomalyConsec.current[id] ?? 0) + 1;
        // Require 2+ consecutive anomalies to reduce false positives
        if ((anomalyConsec.current[id] ?? 0) >= 2) {
          checkForSOS(nextState, id);
        }
      } else {
        anomalyConsec.current[id] = 0;
      }

      saveBiometricState(nextState);
      return nextState;
    });
    setCurrentValues(prev => ({ ...prev, [id]: value }));
  }, [checkForSOS]);

  // ── Start/Stop monitoring ────────────────────────────────────────────────────
  function startMonitoring() {
    if (monitoring) return;
    setMonitoring(true);

    // Accelerometer for live movement
    Accelerometer.setUpdateInterval(400);
    accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
      accelRef.current = { x, y, z };
      const mag = Math.sqrt(x * x + y * y + z * z);
      const dev = Math.abs(mag - 1.0);
      prevMags.current = [...prevMags.current, mag].slice(-12);

      // Compute variance for erratic detection
      const recentDev = prevMags.current.map(m => Math.abs(m - 1.0));
      const meanDev = recentDev.reduce((a, b) => a + b, 0) / recentDev.length;
      const variance = recentDev.reduce((s, v) => s + (v - meanDev) ** 2, 0) / recentDev.length;

      if (dev < 0.08) setMovementLabel('Still');
      else if (variance > 0.04) setMovementLabel('Erratic');
      else if (dev < 0.4) setMovementLabel('Walking');
      else setMovementLabel('Active');

      setCurrentValues(prev => ({ ...prev, movement: Math.round(dev * 100) }));
    });

    // Feed movement to AI every 2 seconds
    movementTimer.current = setInterval(() => {
      const { x, y, z } = accelRef.current;
      const mag = Math.sqrt(x * x + y * y + z * z);
      const dev = Math.abs(mag - 1.0);
      processReading('movement', dev);
    }, 2000);
  }

  function stopMonitoring() {
    setMonitoring(false);
    accelSub.current?.remove();
    accelSub.current = null;
    if (movementTimer.current) { clearInterval(movementTimer.current); movementTimer.current = null; }
    prevMags.current = [];
  }

  function toggleMonitoring() {
    if (monitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  }

  // ── SOS Countdown ────────────────────────────────────────────────────────────
  function startSOSCountdown() {
    setSosCountdown(SOS_COUNTDOWN_SEC);
    let remaining = SOS_COUNTDOWN_SEC;
    sosTimer.current = setInterval(() => {
      remaining -= 1;
      setSosCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(sosTimer.current!);
        setSosCountdown(null);
        triggerSOS().then(result => {
          Alert.alert(
            '🚨 SOS Sent by AI Monitor',
            result.success
              ? `Biometric anomaly detected. Alert sent to ${result.contactCount} contact${result.contactCount !== 1 ? 's' : ''}.`
              : 'No contacts found. Add contacts in Trusted Circle.',
          );
        });
      }
    }, 1000);
  }

  function cancelSOS() {
    if (sosTimer.current) { clearInterval(sosTimer.current); sosTimer.current = null; }
    setSosCountdown(null);
    setSosReason('');
    // Reset anomaly consecutive counters to avoid immediate re-trigger
    anomalyConsec.current = {};
  }

  // ── Manual reading submission ─────────────────────────────────────────────────
  function submitManualReading() {
    if (!inputSensor) return;
    const num = parseFloat(inputValue.trim());
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid', 'Please enter a valid positive number.');
      return;
    }
    processReading(inputSensor, num);
    setInputSensor(null);
    setInputValue('');
  }

  // ── Reset ────────────────────────────────────────────────────────────────────
  function handleReset() {
    Alert.alert(
      'Reset All Baselines',
      'This will clear all learned patterns and start fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (!biometricState) return;
            const fresh = await resetBaseline(biometricState);
            setBiometricState(fresh);
            setCurrentValues({});
            anomalyConsec.current = {};
          },
        },
      ],
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function getStatusColor(id: SensorId): string {
    if (!biometricState) return colors.textMuted;
    const b = biometricState.baselines[id];
    if (!b.isLearned) return '#D97706';
    const last = b.lastAnomalyAt;
    if (last && Date.now() - last < 15000) return '#DC2626';
    return '#16A34A';
  }

  function getStatusLabel(id: SensorId): string {
    if (!biometricState) return 'Loading...';
    const b = biometricState.baselines[id];
    if (!b.isLearned) {
      const pct = Math.round(baselineProgress(biometricState, id) * 100);
      return `Learning ${pct}%`;
    }
    const last = b.lastAnomalyAt;
    if (last && Date.now() - last < 15000) return 'ANOMALY';
    return 'Normal';
  }

  function getMovementBg(): string {
    const map: Record<string, string> = {
      Still: '#DCFCE7',
      Walking: '#EDE9FE',
      Active: '#DBEAFE',
      Erratic: '#FEE2E2',
    };
    return map[movementLabel] ?? '#EDE9FE';
  }

  function getMovementTextColor(): string {
    const map: Record<string, string> = {
      Still: '#16A34A',
      Walking: '#7C3AED',
      Active: '#1D4ED8',
      Erratic: '#DC2626',
    };
    return map[movementLabel] ?? '#7C3AED';
  }

  const learnedCount = biometricState
    ? SENSORS.filter(s => biometricState.baselines[s.id].isLearned).length
    : 0;

  const aiStatus = !monitoring
    ? 'paused'
    : learnedCount === 0
    ? 'learning'
    : learnedCount < SENSORS.length
    ? 'partial'
    : 'monitoring';

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* SOS Countdown Overlay */}
      {sosCountdown !== null && (
        <View style={styles.sosOverlay}>
          <View style={styles.sosOverlayCard}>
            <MaterialCommunityIcons name="brain" size={32} color="#DC2626" />
            <Text style={styles.sosOverlayTitle}>AI ANOMALY DETECTED</Text>
            <Text style={styles.sosOverlayReason}>{sosReason}</Text>
            <Text style={styles.sosOverlayCountdown}>{sosCountdown}</Text>
            <Text style={styles.sosOverlayHint}>seconds until SOS is sent</Text>
            <TouchableOpacity style={styles.sosCancelBtn} onPress={cancelSOS} activeOpacity={0.85}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
              <Text style={styles.sosCancelText}>Cancel — I'm Safe</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Biometric Monitor</Text>
            <Text style={styles.headerSub}>AI learns your normal, alerts on danger</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, monitoring && styles.toggleBtnOn]}
            onPress={toggleMonitoring}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={monitoring ? 'shield-check' : 'shield-off-outline'}
              size={18}
              color={monitoring ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.toggleText, monitoring && styles.toggleTextOn]}>
              {monitoring ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI Status Banner */}
        <Animated.View style={[
          styles.aiBanner,
          aiStatus === 'monitoring' && styles.aiBannerActive,
          aiStatus === 'learning' && styles.aiBannerLearning,
          aiStatus === 'partial' && styles.aiBannerPartial,
          monitoring && { transform: [{ scale: pulseAnim }] },
        ]}>
          <MaterialCommunityIcons
            name={aiStatus === 'paused' ? 'brain' : aiStatus === 'monitoring' ? 'shield-check' : 'brain'}
            size={26}
            color={
              aiStatus === 'paused' ? colors.textMuted
                : aiStatus === 'monitoring' ? '#16A34A'
                : '#D97706'
            }
          />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.aiBannerTitle,
              aiStatus === 'monitoring' && { color: '#16A34A' },
              (aiStatus === 'learning' || aiStatus === 'partial') && { color: '#D97706' },
            ]}>
              {aiStatus === 'paused' && 'AI Monitoring Paused'}
              {aiStatus === 'learning' && 'AI Learning Your Baseline...'}
              {aiStatus === 'partial' && `AI Monitoring — ${learnedCount}/${SENSORS.length} sensors learned`}
              {aiStatus === 'monitoring' && 'AI Actively Monitoring'}
            </Text>
            <Text style={styles.aiBannerSub}>
              {aiStatus === 'paused' && 'Tap the ON button to begin monitoring.'}
              {aiStatus === 'learning' && 'Add readings for each sensor to build your personal baseline.'}
              {aiStatus === 'partial' && 'SOS fires when 2+ sensors show simultaneous anomaly.'}
              {aiStatus === 'monitoring' && `All ${SENSORS.length} sensors learned. SOS fires on multi-sensor anomaly.`}
            </Text>
          </View>
        </Animated.View>

        {/* How it triggers */}
        <View style={styles.triggerInfoRow}>
          <View style={styles.triggerInfoItem}>
            <MaterialCommunityIcons name="numeric-2-circle-outline" size={20} color="#7C3AED" />
            <Text style={styles.triggerInfoText}>2+ sensors anomalous simultaneously</Text>
          </View>
          <View style={styles.triggerInfoDivider} />
          <View style={styles.triggerInfoItem}>
            <MaterialCommunityIcons name="timer-outline" size={20} color="#7C3AED" />
            <Text style={styles.triggerInfoText}>{SOS_COUNTDOWN_SEC}s cancel window</Text>
          </View>
        </View>

        {/* Sensor Cards */}
        <Text style={styles.sectionLabel}>Sensor Readings</Text>
        <View style={styles.sensorGrid}>
          {SENSORS.map(sensor => {
            const val = currentValues[sensor.id];
            const prog = biometricState ? baselineProgress(biometricState, sensor.id) : 0;
            const statusColor = getStatusColor(sensor.id);
            const statusLabel = getStatusLabel(sensor.id);
            const isExpanded = inputSensor === sensor.id;

            return (
              <View key={sensor.id} style={[
                styles.sensorCard,
                isExpanded && { borderColor: sensor.accentColor, borderWidth: 2 },
              ]}>
                {/* Card header */}
                <View style={styles.sensorCardTop}>
                  <View style={[styles.sensorIcon, { backgroundColor: sensor.bgColor }]}>
                    <MaterialCommunityIcons name={sensor.icon as any} size={22} color={sensor.accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sensorLabel}>{sensor.label}</Text>
                    <View style={[styles.sensorStatusBadge, { backgroundColor: statusColor + '20' }]}>
                      <View style={[styles.sensorStatusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.sensorStatusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                </View>

                {/* Value */}
                {sensor.isLive ? (
                  <View style={styles.sensorValueRow}>
                    <Text style={[styles.sensorValue, { color: sensor.accentColor }]}>
                      {movementLabel}
                    </Text>
                    <View style={[styles.movementBadge, { backgroundColor: getMovementBg() }]}>
                      <Text style={[styles.movementBadgeText, { color: getMovementTextColor() }]}>
                        {monitoring ? 'LIVE' : 'PAUSED'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.sensorValueRow}>
                    <Text style={[styles.sensorValue, { color: sensor.accentColor }]}>
                      {val !== undefined ? `${Number.isInteger(val) ? val : val.toFixed(1)}` : '—'}
                      {val !== undefined && <Text style={styles.sensorUnit}> {sensor.unit}</Text>}
                    </Text>
                  </View>
                )}

                {/* Baseline progress bar */}
                {prog < 1 && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${prog * 100}%` as any, backgroundColor: sensor.accentColor }]} />
                  </View>
                )}

                <Text style={styles.sensorDesc}>{sensor.description}</Text>

                {/* Add reading button (non-live sensors) */}
                {!sensor.isLive && (
                  <>
                    {isExpanded ? (
                      <View style={styles.inputRow}>
                        <TextInput
                          style={[styles.sensorInput, { borderColor: sensor.accentColor }]}
                          value={inputValue}
                          onChangeText={setInputValue}
                          keyboardType="decimal-pad"
                          placeholder={`Enter ${sensor.unit || 'value'}`}
                          placeholderTextColor={colors.textMuted}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={[styles.submitBtn, { backgroundColor: sensor.accentColor }]}
                          onPress={submitManualReading}
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons name="check" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelInputBtn}
                          onPress={() => { setInputSensor(null); setInputValue(''); }}
                        >
                          <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addReadingBtn, { borderColor: sensor.accentColor }]}
                        onPress={() => { setInputSensor(sensor.id); setInputValue(''); }}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="plus" size={14} color={sensor.accentColor} />
                        <Text style={[styles.addReadingText, { color: sensor.accentColor }]}>Add Reading</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* AI Baseline Info */}
        {biometricState && (
          <>
            <Text style={styles.sectionLabel}>Learned Baselines</Text>
            <View style={styles.baselineCard}>
              {SENSORS.map((s, i) => {
                const b = biometricState.baselines[s.id];
                return (
                  <View key={s.id} style={[styles.baselineRow, i < SENSORS.length - 1 && styles.baselineRowBorder]}>
                    <MaterialCommunityIcons name={s.icon as any} size={16} color={s.accentColor} />
                    <Text style={styles.baselineName}>{s.label}</Text>
                    <View style={{ flex: 1 }} />
                    {b.isLearned ? (
                      <Text style={styles.baselineStats}>
                        {b.mean.toFixed(1)} ± {b.stdDev.toFixed(2)} {s.unit}
                      </Text>
                    ) : (
                      <View style={styles.baselineLearnRow}>
                        <View style={styles.baselineLearnBar}>
                          <View style={[styles.baselineLearnFill, { width: `${baselineProgress(biometricState, s.id) * 100}%` as any }]} />
                        </View>
                        <Text style={styles.baselineLearnPct}>
                          {biometricState.baselines[s.id].readings.length}/20
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Sensitivity */}
        <Text style={styles.sectionLabel}>AI Sensitivity</Text>
        <View style={styles.sensitivityRow}>
          {SENSITIVITIES.map(opt => {
            const active = biometricState?.sensitivity === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sensitivityBtn, active && styles.sensitivityBtnActive]}
                onPress={() => {
                  if (!biometricState) return;
                  const next = { ...biometricState, sensitivity: opt.id };
                  setBiometricState(next);
                  saveBiometricState(next);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.sensitivityLabel, active && styles.sensitivityLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.sensitivityDesc, active && { color: '#7C3AED' }]}>{opt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sensor Overview */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>What The AI Monitors</Text>
          {[
            { icon: 'heart-pulse', color: '#DC2626', text: 'Heart rate spike or drop beyond your normal range' },
            { icon: 'run', color: '#7C3AED', text: 'Sudden erratic body movement, impacts, or unusual stillness' },
            { icon: 'water-percent', color: '#0891B2', text: 'Blood oxygen drop indicating respiratory distress' },
            { icon: 'lungs', color: '#0D9488', text: 'Breathing rate change during panic or physical threat' },
            { icon: 'brain', color: '#7C3AED', text: 'Multiple sensors anomalous simultaneously = highest threat' },
          ].map((item, i) => (
            <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
              <View style={styles.infoIconWrap}>
                <MaterialCommunityIcons name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={styles.infoText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Reset */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
          <MaterialCommunityIcons name="refresh" size={16} color="#DC2626" />
          <Text style={styles.resetBtnText}>Reset All Baselines</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 14 },

    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    toggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.chipBorder,
      backgroundColor: colors.chipBg,
    },
    toggleBtnOn: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
    toggleText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    toggleTextOn: { color: '#fff' },

    aiBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    aiBannerActive: { borderColor: '#86EFAC', backgroundColor: '#DCFCE7' },
    aiBannerLearning: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
    aiBannerPartial: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
    aiBannerTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    aiBannerSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

    triggerInfoRow: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    triggerInfoItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
    },
    triggerInfoDivider: { width: 1, backgroundColor: colors.divider },
    triggerInfoText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 16 },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 4,
    },

    sensorGrid: { gap: 10 },
    sensorCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sensorCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sensorIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sensorLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    sensorStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    sensorStatusDot: { width: 6, height: 6, borderRadius: 3 },
    sensorStatusText: { fontSize: 11, fontWeight: '700' },
    sensorValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sensorValue: { fontSize: 26, fontWeight: '800' },
    sensorUnit: { fontSize: 14, fontWeight: '500' },
    movementBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    movementBadgeText: { fontSize: 12, fontWeight: '800' },
    sensorDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },
    progressBar: {
      height: 4,
      backgroundColor: colors.chipBg,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 2 },
    addReadingBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    addReadingText: { fontSize: 12, fontWeight: '700' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sensorInput: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: 10,
      padding: 8,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    submitBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelInputBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    baselineCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    baselineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    baselineRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    baselineName: { fontSize: 13, color: colors.text, fontWeight: '500' },
    baselineStats: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    baselineLearnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    baselineLearnBar: { width: 60, height: 4, backgroundColor: colors.chipBg, borderRadius: 2, overflow: 'hidden' },
    baselineLearnFill: { height: '100%', backgroundColor: '#D97706', borderRadius: 2 },
    baselineLearnPct: { fontSize: 11, color: '#D97706', fontWeight: '700' },

    sensitivityRow: { flexDirection: 'row', gap: 8 },
    sensitivityBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      gap: 4,
    },
    sensitivityBtnActive: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
    sensitivityLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    sensitivityLabelActive: { color: '#7C3AED' },
    sensitivityDesc: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },

    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      gap: 0,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    infoCardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
    infoRowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
    infoIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    infoText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },

    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: '#DC2626',
    },
    resetBtnText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },

    // SOS Countdown Overlay
    sosOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    },
    sosOverlayCard: {
      backgroundColor: '#fff',
      borderRadius: 24,
      padding: 32,
      marginHorizontal: 24,
      alignItems: 'center',
      gap: 10,
    },
    sosOverlayTitle: { fontSize: 20, fontWeight: '900', color: '#DC2626', textAlign: 'center' },
    sosOverlayReason: { fontSize: 13, color: '#374151', textAlign: 'center', lineHeight: 19 },
    sosOverlayCountdown: { fontSize: 72, fontWeight: '900', color: '#DC2626', lineHeight: 76 },
    sosOverlayHint: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
    sosCancelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#DC2626',
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 4,
    },
    sosCancelText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  });
}
