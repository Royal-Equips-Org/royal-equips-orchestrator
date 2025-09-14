// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // 0) Globale ignores (sneller + schoner)
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.next/**",
      "**/out/**",
      "**/public/assets/**",
      "**/*.min.js",
      "**/vendor/**"
    ],
  },

  // 1) Basisregels
  js.configs.recommended,

  // 2) Node (scripts, backend, configs)
  {
    files: [
      "**/*.cjs",
      "**/*.mjs",
      "scripts/**/*.js",
      "server/**/*.js",
      "backend/**/*.js",
      "*.config.{js,cjs,mjs}",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
        console: "readonly",
      },
    },
    rules: {},
  },

  // 3) Browser / dashboard (JS & JSX)
  // Let op: voeg TS pas toe wanneer @typescript-eslint is geconfigureerd
  {
    files: ["dashboard/**/*.{js,jsx}", "public/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.webworker,
        TextEncoder: "readonly",
        TransformStream: "readonly",
        crypto: "readonly",
        URL: "readonly",
        Headers: "readonly",
        AbortSignal: "readonly",
      },
    },
    rules: {},
  },

  // 4) Edge/Workers
  {
    files: ["edge/**", "workers/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.worker,
        ...globals.browser,
      },
    },
    rules: {},
  },

  // 5) Tests (Jest)
  {
    files: ["**/*.test.*", "**/__tests__/**"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.jest,
      },
    },
    rules: {},
  },
];
