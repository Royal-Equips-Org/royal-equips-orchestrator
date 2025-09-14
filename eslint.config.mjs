// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // 1) Globale ignores (ESLint v9 flat config)
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "**/*.min.js",
      // bundler output
      "app/static/assets/**",
      "app/static/react-vendor*.js",
      "dashboard/.next/**",
      "dashboard/dist/**",
    ],
  },

  // 2) Basisregels voor JS
  js.configs.recommended,

  // 3) Node / scripts / backend
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2021, console: "readonly" },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // 4) TypeScript in src en dashboard
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // 5) Browser / dashboard
  {
    files: ["dashboard/**/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
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
  },

  // 6) Edge/Workers (Cloudflare/Vercel)
  {
    files: ["edge-functions/**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.worker,
        ...globals.serviceworker,
        ...globals.webworker,
        // veelvoorkomende runtime-globals
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        WebSocketPair: "readonly",
        caches: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // 7) Tests
  {
    files: ["**/*.test.*", "**/__tests__/**"],
    languageOptions: { globals: { ...globals.jest } },
  },
];
