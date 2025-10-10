const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");

module.exports = [
  { ignores: ["**/.*", "dist/**", "build/**", "src/index.js", "vendor/**", "**/*.min.js"] },

  // CJS config-bestanden
  {
    files: ["*.config.cjs", "commitlint.config.cjs"],
    languageOptions: { sourceType: "commonjs", parser: tsParser, globals: globals.node },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: { "@typescript-eslint/no-require-imports": "off", "no-undef": "off" }
  },

  // Node (scripts, packages)
  {
    files: ["scripts/**/*.js", "packages/**/*.{ts,tsx,js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: "latest", sourceType: "module", parser: tsParser, globals: globals.node
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off"   // <-- Fix
    }
  },

  // Edge/Browser
  {
    files: ["edge-functions/**/*.js", "src/**/*.{js,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest", sourceType: "module", parser: tsParser,
      globals: { ...globals.browser, ...globals.worker }
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-expressions": "off",
      "no-empty": "off", "no-case-declarations": "off",
      "no-prototype-builtins": "off", "no-useless-escape": "off"
    }
  },

  { linterOptions: { reportUnusedDisableDirectives: "warn" } }
];
