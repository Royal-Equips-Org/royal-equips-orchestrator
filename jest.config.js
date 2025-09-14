export default {
  testEnvironment: "node",
  reporters: [
    "default",
    ["jest-junit", { outputDirectory: "reports/junit", outputName: "junit.xml" }],
  ],
  roots: ["<rootDir>/tests", "<rootDir>/__tests__"],
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
  passWithNoTests: true,
};
