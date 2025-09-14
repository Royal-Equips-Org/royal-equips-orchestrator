module.exports = {
  root: true,
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "app/**",
    "edge-functions/**",
    "src/**",
    ".husky/**",
    ".eslintrc.cjs",
    "commitlint.config.cjs",
  ],
  overrides: [
    {
      files: ["packages/**/*.{ts,tsx}", "agents/**/*.{ts,tsx}", "services/**/*.{ts,tsx}"],
      parser: "@typescript-eslint/parser",
      parserOptions: { tsconfigRootDir: __dirname, project: ["./tsconfig.base.json"] },
      plugins: ["@typescript-eslint", "import"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off"
      }
    },
    {
      files: ["**/*.js","**/*.cjs"],
      extends: ["eslint:recommended"],
    }
  ],
};
