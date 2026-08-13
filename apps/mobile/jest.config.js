/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  rootDir: ".",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/.maestro/", "/e2e/"],
  // jest-expo's default `transformIgnorePatterns` is written for pnpm/yarn
  // layouts. Bun hoists real packages under `node_modules/.bun/<pkg>/node_modules/<pkg>/…`,
  // so the negative lookahead never matches and the preset's own ESM setup
  // files go un-transformed ("Cannot use import statement outside a module").
  // This bun-aware pattern un-ignores the packages that need babel.
  transformIgnorePatterns: [
    "node_modules/\\.bun/.*?node_modules/(?!(@?react-native|expo|@expo|@expo-google-fonts|@react-navigation|react-navigation|@sentry|nativewind|native-base|standard-navigation|react-native-reanimated|react-native-worklets|react-native-safe-area-context|react-native-gesture-handler|react-native-screens|react-native-css-interop|@expense-tracker|@testing-library|@babel|metro))",
  ],
  maxWorkers: "50%",
}
