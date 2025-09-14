// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.next/**",
      "**/out/**",
      "**/*.min.js",
    ],
  },

  // basisregels
  js.configs.recommended,

  // TypeScript (src + dashboard)
  ...tseslint.configs.recommendedTypeChecked.map(cfg => ({
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

  // Node
  {
    files: ["**/*.cjs", "**/*.mjs", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
  },

  // Browser (dashboard, public)
  {
    files: ["dashboard/**/*.{js,jsx,ts,tsx}", "public/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
  },

  // Tests
  {
    files: ["**/*.test.*", "**/__tests__/**"],
    languageOptions: { globals: { ...globals.jest } },
  },
];
