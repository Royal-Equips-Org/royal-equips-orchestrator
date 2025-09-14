/** @type {import("jest").Config} */
module.exports = {
  reporters: [
    "default",
    ["jest-junit", { outputDirectory: "reports/junit", outputName: "junit.xml" }]
  ],
};
