// Royal Equips Org: ESLint Flat Config (Enterprise-grade, Robust)
// ---------------------------------------------------------------
// - Strict typing, modular overrides, and self-healing patterns
// - Security defaults, scalable ignore rules, and environment-aware globals
// - TypeScript + JS harmony, robust test coverage, and future-proofing

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Helper for robust ignore patterns
const IGNORE_PATTERNS = [
  "node_modules/**",
  "dist/**",
  "build/**",
  "coverage/**",
  "vendor/**",
  "**/*.min.js",
  "app/static/assets/**",
  "app/static/react-vendor*.js",
  "dashboard/.next/**",
  "dashboard/dist/**",
  "tools/royal-fix-agent/**"
];

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Global ignores (robust against accidental linting)
  { ignores: IGNORE_PATTERNS },

  // JS recommended config (base security/stability)
  js.configs.recommended,

  // TypeScript - strict type-checking, multiple tsconfigs for monorepo/test support
  ...tseslint.configs.recommendedTypeChecked.map(cfg => ({
    ...cfg,
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ...cfg.languageOptions,
      sourceType: "module",
      parserOptions: {
        project: ["./tsconfig.base.json", "./tsconfig.tests.json"],
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 2022
      }
    },
    rules: {
      ...cfg.rules,
      // Strong unused vars handling (TS > JS, ignore underscore convention)
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      // Extra strictness for enterprise: ban explicit any, enforce return types
      "@typescript-eslint/no-explicit-any": ["warn", { ignoreRestArgs: false }],
      "@typescript-eslint/explicit-function-return-type": "warn"
    }
  })),

  // JS scripts/configs - Node globals, error handling, console allowed
  {
    files: ["**/*.{js,cjs,mjs}", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
        console: "readonly"
      }
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  },

  // Frontend/browser code - allow browser, serviceworker, webworker globals
  {
    files: [
      "dashboard/**/*.{js,ts,jsx,tsx}",
      "public/**/*.{js,jsx}"
    ],
    languageOptions: {
      ecmaVersion: 2022,
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
        AbortSignal: "readonly"
      }
    }
  },

  // Edge functions/cloud workers - robust cloud-native globals
  {
    files: ["edge-functions/**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.worker,
        ...globals.serviceworker,
        ...globals.webworker,
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        WebSocketPair: "readonly",
        caches: "readonly"
      }
    },
    rules: {
      // Allow unused vars for event-driven handlers
      "no-unused-vars": "off"
    }
  },

  // Test files - robust jest globals, future-proof for test frameworks
  {
    files: ["**/*.test.*", "**/__tests__/**"],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  },

  // Special case: src/index.js - allow 'c' and '_' as unused for enterprise main entry
  {
    files: ["src/index.js"],
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^(?:_|c)$", varsIgnorePattern: "^_" }
      ]
    }
  }
];
