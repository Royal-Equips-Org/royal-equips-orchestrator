// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Globale ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.next/**",
      "**/out/**",
      "**/*.min.js",
      "**/public/assets/**",
      "**/vendor/**",
    ],
  },

  // Basis JS
  js.configs.recommended,

  // TypeScript met type-aware rules
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ...cfg.languageOptions,
      parserOptions: {
        project: ["./tsconfig.base.json"],
        tsconfigRootDir: process.cwd(),
      },
    },
  })),

  // Node / scripts
  {
    files: ["**/*.cjs", "**/*.mjs", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {},
  },

  // Browser / dashboard
  {
    files: ["dashboard/**/*.{js,jsx,ts,tsx}", "public/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {},
  },

  // Tests
  {
    files: ["**/*.test.*", "**/__tests__/**"],
    languageOptions: { globals: { ...globals.jest } },
    rules: {},
  },
];
