module.exports = function (api) {
  api.cache(true)

  // `babel-preset-expo` (SDK 54) auto-adds the `react-native-worklets/plugin`
  // when worklets/reanimated is installed, so we do NOT list it explicitly.
  // Uniwind needs no babel preset or plugin: `className` -> style resolution
  // runs in Metro (see metro.config.js). Under jest `className` stays a plain
  // ignored prop - tests assert observable behavior, never computed styles.
  return {
    presets: ["babel-preset-expo"],
    plugins: [],
  }
}
