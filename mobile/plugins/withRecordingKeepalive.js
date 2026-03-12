const fs = require('node:fs');
const path = require('node:path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

const TEMPLATE_DIR = path.join(__dirname, 'recording-keepalive');
const MODULE_IMPORT = 'RecordingKeepalivePackage';
const SERVICE_NAME = '.keepalive.RecordingKeepaliveService';
const RECEIVER_NAME = '.keepalive.KeepaliveStopReceiver';

function withRecordingKeepalive(config) {
  config = withRecordingKeepaliveManifest(config);
  config = withRecordingKeepaliveMainApplication(config);
  return withRecordingKeepaliveSources(config);
}

function withRecordingKeepaliveManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    addUsesPermission(manifest, 'android.permission.FOREGROUND_SERVICE');
    addUsesPermission(manifest, 'android.permission.FOREGROUND_SERVICE_MICROPHONE');
    addUsesPermission(manifest, 'android.permission.POST_NOTIFICATIONS');
    addUsesPermission(manifest, 'android.permission.WAKE_LOCK');

    addApplicationNode(mainApplication, 'service', {
      'android:name': SERVICE_NAME,
      'android:enabled': 'true',
      'android:exported': 'false',
      'android:foregroundServiceType': 'microphone',
      'android:stopWithTask': 'false',
    });
    addApplicationNode(mainApplication, 'receiver', {
      'android:name': RECEIVER_NAME,
      'android:enabled': 'true',
      'android:exported': 'false',
    });

    return config;
  });
}

function withRecordingKeepaliveMainApplication(config) {
  return withMainApplication(config, (config) => {
    const appPackage = config.android?.package;
    if (!appPackage) {
      throw new Error('android.package is required for recording keepalive setup.');
    }

    const file = config.modResults;
    const importLine = `${appPackage}.keepalive.${MODULE_IMPORT}`;
    const addPackageLine =
      file.language === 'kt'
        ? '          add(RecordingKeepalivePackage())'
        : '      packages.add(new RecordingKeepalivePackage());';

    if (!file.contents.includes(importLine)) {
      file.contents = file.contents.replace(
        /^package .*?$\n\n/m,
        (match) => `${match}import ${importLine}\n`,
      );
    }

    if (!file.contents.includes(addPackageLine)) {
      if (file.language === 'kt') {
        file.contents = file.contents.replace(
          /PackageList\(this\)\.packages\.apply \{\n/,
          (match) => `${match}${addPackageLine}\n`,
        );
      } else {
        file.contents = file.contents.replace(
          /PackageList\(this\)\.getPackages\(\);?\n/,
          (match) => `${match}${addPackageLine}\n`,
        );
      }
    }

    config.modResults = file;
    return config;
  });
}

function withRecordingKeepaliveSources(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const appPackage = config.android?.package;
      if (!appPackage) {
        throw new Error('android.package is required for recording keepalive sources.');
      }

      const targetDir = path.join(
        config.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        ...appPackage.split('.'),
        'keepalive',
      );

      fs.mkdirSync(targetDir, { recursive: true });

      for (const fileName of fs.readdirSync(TEMPLATE_DIR)) {
        const src = path.join(TEMPLATE_DIR, fileName);
        const dest = path.join(targetDir, fileName);
        const contents = fs
          .readFileSync(src, 'utf8')
          .replace(/__PACKAGE__/g, appPackage)
          .replace(/__APP_NAME__/g, config.name || 'Project Context');
        fs.writeFileSync(dest, contents);
      }

      return config;
    },
  ]);
}

function addUsesPermission(manifest, permission) {
  const usesPermissions = manifest.manifest['uses-permission'] || [];
  const exists = usesPermissions.some((item) => item.$?.['android:name'] === permission);
  if (!exists) {
    usesPermissions.push({ $: { 'android:name': permission } });
  }
  manifest.manifest['uses-permission'] = usesPermissions;
}

function addApplicationNode(mainApplication, key, attributes) {
  const items = mainApplication[key] || [];
  const exists = items.some((item) => item.$?.['android:name'] === attributes['android:name']);
  if (!exists) {
    items.push({ $: attributes });
  }
  mainApplication[key] = items;
}

module.exports = withRecordingKeepalive;
