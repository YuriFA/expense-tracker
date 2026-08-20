// Disables the expo-dev-menu floating debug button (top-right corner).
// It defaults to ON, overlays app UI, and intercepts taps in that corner;
// the dev menu stays reachable via ⌘D / shake / three-finger long-press.
// The UserDefaults/SharedPreferences value still wins if a user re-enables
// the button in the dev menu settings — this only changes the fresh-install
// default (Info.plist key on iOS, manifest meta-data on Android).
const { withInfoPlist, withAndroidManifest } = require('expo/config-plugins')

const withDevMenuFab = (config) => {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.EXDevMenuShowFloatingActionButton = false
    return cfg
  })
  config = withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0]
    if (application) {
      application['meta-data'] = [
        ...(application['meta-data'] ?? []),
        {
          $: {
            'android:name': 'EXDevMenuShowFloatingActionButton',
            'android:value': 'false',
          },
        },
      ]
    }
    return cfg
  })
  return config
}

module.exports = withDevMenuFab
