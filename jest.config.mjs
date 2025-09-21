// jest.config.mjs
export default {
  testEnvironment: "node",
  reporters: [
    "default",
    ["jest-junit", { outputDirectory: "reports/junit", outputName: "junit.xml" }],
  ],
  testMatch: [
    "**/tests/**/*.test.{js,ts}",
    "**/__tests__/**/*.test.{js,ts}",
    "**/src/**/*.test.{js,ts}",
    "**/packages/**/*.test.{js,ts}",
    "**/apps/**/*.test.{js,ts}"
  ],
  testPathIgnorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    "app/static/assets/",
    "vendor/",
    ".next/",
    "reports/"
  ],
  passWithNoTests: true
};
