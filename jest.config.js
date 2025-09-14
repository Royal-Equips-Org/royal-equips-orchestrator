export default {
  testEnvironment: "node",
  reporters: [
    "default",
    ["jest-junit", { outputDirectory: "reports/junit", outputName: "junit.xml" }]
  ],
  passWithNoTests: true
};
