const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Android 14+ requires foregroundServiceType on the service declaration.
 * react-native-background-actions registers RNBackgroundActionsTask but
 * does not set the type, so the app crashes when BackgroundService.start()
 * is called.  This plugin patches the merged manifest at prebuild time.
 */
module.exports = function withBackgroundActions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    const services = application.service ?? [];
    let found = false;

    for (const service of services) {
      const name = service.$?.['android:name'] ?? '';
      if (name.includes('RNBackgroundActionsTask')) {
        service.$['android:foregroundServiceType'] = 'microphone';
        found = true;
        break;
      }
    }

    if (!found) {
      services.push({
        $: {
          'android:name': 'com.asterinet.react.bgactions.RNBackgroundActionsTask',
          'android:foregroundServiceType': 'microphone',
        },
      });
      application.service = services;
    }

    return config;
  });
};
