import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const STOP_REQUESTED_EVENT = 'recordingKeepaliveStopRequested';

type RecordingKeepaliveNativeModule = {
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
  startForegroundService: (title: string, text: string) => Promise<void>;
  stopForegroundService: () => Promise<void>;
};

const nativeModule =
  Platform.OS === 'android'
    ? (NativeModules.RecordingKeepalive as RecordingKeepaliveNativeModule | undefined)
    : undefined;

const nativeEmitter = nativeModule ? new NativeEventEmitter(nativeModule) : null;

async function ensureNotificationPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (!permission) return;

  const granted = await PermissionsAndroid.request(permission);
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Notification permission is required for keepalive recording.');
  }
}

function ensureNativeModule(): RecordingKeepaliveNativeModule {
  if (!nativeModule) {
    throw new Error('Recording keepalive native module is unavailable. Rebuild the Android app.');
  }
  return nativeModule;
}

export async function startRecordingKeepaliveNotification() {
  if (Platform.OS !== 'android') return;
  await ensureNotificationPermission();
  await ensureNativeModule().startForegroundService(
    'Recording in progress',
    'Project Context is keeping your recording alive.',
  );
}

export async function stopRecordingKeepaliveNotification() {
  if (Platform.OS !== 'android' || !nativeModule) return;
  await nativeModule.stopForegroundService();
}

export function addRecordingKeepaliveStopListener(listener: () => void) {
  if (!nativeEmitter) return { remove() {} };
  return nativeEmitter.addListener(STOP_REQUESTED_EVENT, listener);
}
