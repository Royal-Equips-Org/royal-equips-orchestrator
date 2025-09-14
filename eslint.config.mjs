import js from "@eslint/js";
import globals from "globals";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // basisregels
  js.configs.recommended,

  // Node (scripts, backend)
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    ignores: ["node_modules/**", "dist/**", "build/**", "**/*.min.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.es2021,
        console: "readonly",
      },
    },
    rules: {},
  },

  // Browser / dashboard
  {
    files: ["dashboard/**/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.serviceworker,   // Headers, Request, Response, fetch
        ...globals.webworker,       // self, WorkerGlobalScope
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

  // Edge/Workers (indien aanwezig, b.v. Cloudflare/Vercel Edge)
  {
    files: ["edge/**", "workers/**"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.worker,
        ...globals.browser,
      },
    },
  },

  // Testbestanden (Jest)
  {
    files: ["**/*.test.*", "**/__tests__/**"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
