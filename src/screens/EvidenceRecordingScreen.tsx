import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme, ThemeColors } from '../theme';

interface EvidenceFile {
  uri: string;
  name: string;
  timestamp: number;
  durationSec: number;
}

const EVIDENCE_DIR = FileSystem.documentDirectory + 'shieldher_evidence/';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(EVIDENCE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(EVIDENCE_DIR, { intermediates: true });
}

async function loadFiles(): Promise<EvidenceFile[]> {
  await ensureDir();
  const names = await FileSystem.readDirectoryAsync(EVIDENCE_DIR);
  const files: EvidenceFile[] = names
    .filter(n => n.endsWith('.m4a'))
    .map(n => {
      const parts = n.replace('.m4a', '').split('_');
      const ts = parseInt(parts[parts.length - 1], 10) || 0;
      return { uri: EVIDENCE_DIR + n, name: n, timestamp: ts, durationSec: 0 };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
  return files;
}

export function EvidenceRecordingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [phase, setPhase] = useState<'idle' | 'recording'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadFiles().then(f => { setFiles(f); setLoading(false); });
    return () => { stopRecordingCleanup(); };
  }, []);

  function stopRecordingCleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
  }

  async function startRecording() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Microphone access is needed to record evidence.');
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recordingRef.current = recording;
    setPhase('recording');
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    await recordingRef.current.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const srcUri = recordingRef.current.getURI();
    recordingRef.current = null;
    setPhase('idle');

    if (!srcUri) return;
    await ensureDir();
    const ts = Date.now();
    const destName = `evidence_${ts}.m4a`;
    const destUri = EVIDENCE_DIR + destName;
    await FileSystem.moveAsync({ from: srcUri, to: destUri });

    const newFile: EvidenceFile = { uri: destUri, name: destName, timestamp: ts, durationSec: elapsed };
    setFiles(prev => [newFile, ...prev]);
    setElapsed(0);
  }

  async function deleteFile(file: EvidenceFile) {
    Alert.alert(
      'Delete Recording',
      'This evidence file will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await FileSystem.deleteAsync(file.uri, { idempotent: true });
            setFiles(prev => prev.filter(f => f.uri !== file.uri));
          },
        },
      ],
    );
  }

  async function shareFile(file: EvidenceFile) {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) { Alert.alert('Sharing not available on this device.'); return; }
    await Sharing.shareAsync(file.uri, { mimeType: 'audio/m4a', dialogTitle: 'Share Evidence' });
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Evidence Recording</Text>
        <Text style={styles.headerSub}>
          Recordings are stored privately on your device and can be shared with authorities.
        </Text>
      </View>

      {/* Recorder */}
      <View style={styles.recorderCard}>
        {phase === 'recording' ? (
          <View style={styles.recorderActive}>
            <View style={styles.recIndicator}>
              <View style={styles.recDot} />
              <Text style={styles.recLabel}>RECORDING</Text>
            </View>
            <Text style={styles.recTimer}>{formatTime(elapsed)}</Text>
            <Text style={styles.recHint}>Recording silently — tap Stop when safe to do so.</Text>
            <TouchableOpacity style={styles.stopBtn} onPress={stopRecording} activeOpacity={0.85}>
              <MaterialCommunityIcons name="stop-circle" size={22} color="#fff" />
              <Text style={styles.stopBtnText}>Stop & Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recorderIdle}>
            <View style={styles.micIconWrap}>
              <MaterialCommunityIcons name="microphone" size={36} color={colors.accentText} />
            </View>
            <Text style={styles.idleTitle}>Start Recording</Text>
            <Text style={styles.idleHint}>
              Audio is recorded silently and saved to your device. Your contacts or authorities can receive it via the share button.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startRecording} activeOpacity={0.85}>
              <MaterialCommunityIcons name="record-circle" size={22} color="#fff" />
              <Text style={styles.startBtnText}>Start Silent Recording</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recordings List */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Saved Recordings</Text>
        <Text style={styles.listCount}>{files.length} file{files.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={files}
        keyExtractor={item => item.uri}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyList}>
              <MaterialCommunityIcons name="file-music-outline" size={48} color="#cdc3d4" />
              <Text style={styles.emptyText}>No recordings yet</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <View style={styles.fileCard}>
            <View style={styles.fileIconWrap}>
              <MaterialCommunityIcons name="shield-lock" size={22} color={colors.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName}>Recording #{files.length - index}</Text>
              <Text style={styles.fileDate}>{formatDate(item.timestamp)}</Text>
            </View>
            <View style={styles.fileActions}>
              <TouchableOpacity style={styles.fileBtn} onPress={() => shareFile(item)}>
                <MaterialCommunityIcons name="share-variant" size={18} color={colors.accentText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fileBtn, { backgroundColor: '#fff1f1' }]}
                onPress={() => deleteFile(item)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      backgroundColor: '#1a0d2e',
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
    headerSub: { fontSize: 13, color: '#a89cab', lineHeight: 18 },
    recorderCard: {
      margin: 16,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    recorderIdle: { alignItems: 'center', gap: 12 },
    micIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    idleTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    idleHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, maxWidth: 280 },
    startBtn: {
      backgroundColor: '#3B0764',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      justifyContent: 'center',
    },
    startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    recorderActive: { alignItems: 'center', gap: 12 },
    recIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dc2626' },
    recLabel: { fontSize: 12, fontWeight: '800', color: '#dc2626', letterSpacing: 2 },
    recTimer: { fontSize: 48, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    recHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
    stopBtn: {
      backgroundColor: '#dc2626',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      justifyContent: 'center',
    },
    stopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    listTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    listCount: { fontSize: 13, color: colors.textSecondary },
    emptyList: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    emptyText: { fontSize: 14, color: colors.textMuted },
    fileCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    fileIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileName: { fontSize: 15, fontWeight: '600', color: colors.text },
    fileDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    fileActions: { flexDirection: 'row', gap: 6 },
    fileBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
