/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  rootDir: ".",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/.maestro/", "/e2e/"],
  // Rely on the `jest-expo` preset's default `transformIgnorePatterns`, which
  // targets a flat (hoisted) node_modules layout - the layout pnpm produces
  // with `node-linker=hoisted` (see repo-root .npmrc). The previous custom
  // pattern was written for Bun's `node_modules/.bun/...` layout.
  maxWorkers: "50%",
}
