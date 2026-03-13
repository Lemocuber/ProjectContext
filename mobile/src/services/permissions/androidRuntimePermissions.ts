import { PermissionsAndroid, Platform } from 'react-native';

export type AndroidRuntimePermissionId = 'microphone' | 'notifications';

export type AndroidRuntimePermissionCard = {
  description: string;
  granted: boolean;
  id: AndroidRuntimePermissionId;
  title: string;
};

const PERMISSION_METADATA: Array<{
  description: string;
  id: AndroidRuntimePermissionId;
  title: string;
}> = [
  {
    id: 'microphone',
    title: 'Microphone',
    description: 'Required to capture live audio and keep the recording session active.',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Required for the ongoing recording notification that keeps Android recording alive.',
  },
];

const PERMISSION_ERRORS: Record<AndroidRuntimePermissionId, string> = {
  microphone: 'Microphone permission is required to start recording.',
  notifications: 'Notification permission is required for keepalive recording.',
};

function isAndroidNotificationRuntimePermissionRequired(): boolean {
  return Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33;
}

async function hasPermission(id: AndroidRuntimePermissionId): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (id === 'notifications' && !isAndroidNotificationRuntimePermissionRequired()) {
    return true;
  }

  const permission =
    id === 'microphone'
      ? PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      : PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

  if (!permission) return true;
  return PermissionsAndroid.check(permission);
}

export async function listAndroidRuntimePermissionCards(): Promise<AndroidRuntimePermissionCard[]> {
  const states = await Promise.all(
    PERMISSION_METADATA.map(async (entry) => ({
      ...entry,
      granted: await hasPermission(entry.id),
    })),
  );

  return states;
}

export async function hasAllRequiredAndroidPermissions(): Promise<boolean> {
  const permissions = await listAndroidRuntimePermissionCards();
  return permissions.every((entry) => entry.granted);
}

export async function requestAndroidRuntimePermission(
  id: AndroidRuntimePermissionId,
): Promise<boolean> {
  if (await hasPermission(id)) return true;

  const permission =
    id === 'microphone'
      ? PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      : PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

  if (!permission) return true;

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function ensureAndroidRuntimePermission(id: AndroidRuntimePermissionId): Promise<void> {
  const granted = await requestAndroidRuntimePermission(id);
  if (!granted) throw new Error(PERMISSION_ERRORS[id]);
}
