const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  // NativeWind's rem base was 14px; keep it so spacing/sizing don't shift.
  polyfills: { rem: 14 },
});
