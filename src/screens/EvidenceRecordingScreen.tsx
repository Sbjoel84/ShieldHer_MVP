import React, { useState, useEffect, useRef } from 'react';
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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
    <View style={{ flex: 1, backgroundColor: '#F9F5FF' }}>
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
              <MaterialCommunityIcons name="microphone" size={36} color="#3B0764" />
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
              <MaterialCommunityIcons name="shield-lock" size={22} color="#3B0764" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName}>Recording #{files.length - index}</Text>
              <Text style={styles.fileDate}>{formatDate(item.timestamp)}</Text>
            </View>
            <View style={styles.fileActions}>
              <TouchableOpacity style={styles.fileBtn} onPress={() => shareFile(item)}>
                <MaterialCommunityIcons name="share-variant" size={18} color="#3B0764" />
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

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1a0d2e',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: '#a89cab', lineHeight: 18 },
  recorderCard: {
    margin: 16,
    backgroundColor: '#fff',
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
  idleTitle: { fontSize: 18, fontWeight: '700', color: '#1b1c1c' },
  idleHint: { fontSize: 13, color: '#4a4452', textAlign: 'center', lineHeight: 19, maxWidth: 280 },
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
  recTimer: { fontSize: 48, fontWeight: '800', color: '#1b1c1c', fontVariant: ['tabular-nums'] },
  recHint: { fontSize: 13, color: '#4a4452', textAlign: 'center' },
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
  listTitle: { fontSize: 16, fontWeight: '700', color: '#1b1c1c' },
  listCount: { fontSize: 13, color: '#4a4452' },
  emptyList: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: '#7c7483' },
  fileCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e2e1',
  },
  fileIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: { fontSize: 15, fontWeight: '600', color: '#1b1c1c' },
  fileDate: { fontSize: 12, color: '#4a4452', marginTop: 2 },
  fileActions: { flexDirection: 'row', gap: 6 },
  fileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0eded',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
