import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import * as Haptics from 'expo-haptics';
import { appendLog } from './activityLog';

const CONTACTS_KEY = '@shieldher_contacts_v2';

interface Contact { id: string; name: string; phone: string; }

export async function triggerSOS(): Promise<{ success: boolean; contactCount: number }> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

  const raw = await AsyncStorage.getItem(CONTACTS_KEY);
  const contacts: Contact[] = raw ? JSON.parse(raw) : [];

  if (contacts.length === 0) return { success: false, contactCount: 0 };

  let locUrl = 'Location unavailable';
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      locUrl = `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
    }
  } catch {}

  const smsAvail = await SMS.isAvailableAsync();
  if (smsAvail) {
    await SMS.sendSMSAsync(
      contacts.map(c => c.phone),
      `🚨 SOS ALERT! I need help right now!\nMy location: ${locUrl}\n\nSent from ShieldHer Safety App`,
    );
  }

  await appendLog({
    type: 'sos',
    title: 'SOS Alert Triggered',
    detail: `Emergency SMS sent to ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}. Location: ${locUrl}`,
  });

  return { success: true, contactCount: contacts.length };
}
