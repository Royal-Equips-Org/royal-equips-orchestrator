// jest.config.mjs
export default {
  preset: 'ts-jest',
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
    "reports/",
    "apps/command-center-ui/" // Exclude vitest tests - they use their own test runner
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        target: 'es2020',
        module: 'commonjs'
      }
    }]
  },
  moduleNameMapping: {
    '^../../../core/(.*)$': '<rootDir>/core/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'core/**/*.ts',
    'apps/api/src/**/*.ts',
    '!**/*.d.ts',
    '!**/*.config.*',
    '!**/node_modules/**'
  ],
  passWithNoTests: true
};
