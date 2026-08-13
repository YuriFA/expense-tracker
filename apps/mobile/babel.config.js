module.exports = function (api) {
  api.cache(true)

  // `babel-preset-expo` (SDK 57) auto-adds the `react-native-worklets/plugin`
  // when worklets/reanimated is installed (see babel-preset-expo/configs/expo.js),
  // so we do NOT list it explicitly here. What this config DOES provide that the
  // preset does not is NativeWind v4: the `jsxImportSource: "nativewind"` option
  // and the `nativewind/babel` preset are required for `className` -> style
  // resolution. Without them NativeWind styling does nothing.
  //
  // Under jest we compile JSX with the standard React runtime and skip NativeWind:
  // `className` becomes a plain ignored prop and `react-native-reanimated` is
  // mocked in jest.setup.js, so neither runtime is needed in tests. (The preset
  // still auto-adds the worklets plugin under jest; the reanimated mock's
  // `useAnimatedStyle` tolerates the transformed worklet.)
  const isJest = Boolean(process.env.JEST_WORKER_ID)
  if (isJest) {
    return {
      presets: ["babel-preset-expo"],
      plugins: [],
    }
  }

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [],
  }
}
