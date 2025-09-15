// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.FlatConfig[]} */
  // 1) Globale ignores
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "**/*.min.js",
      "app/static/assets/**",
      "app/static/react-vendor*.js",
      "dashboard/.next/**",
      "dashboard/dist/**",
      "coverage/**",
      "vendor/**",
    ],
  },

  // 2) Basis JS-regels
  js.configs.recommended,

  // 3) TypeScript (type-aware)
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ...cfg.languageOptions,
      sourceType: "module",
      parserOptions: {
        project: ["./tsconfig.base.json"],
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      ...cfg.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  })),

  // 4) Node / scripts / backend
  {
    files: ["**/*.{js,cjs,mjs}","scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2021, console: "readonly" },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // 5) Browser / dashboard
  {
    files: ["dashboard/**/*.{js,ts,jsx,tsx}", "public/**/*.{js,jsx}"],
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
        AbortSignal: "readonly",
      },
    },
  },

  // 6) Edge/Workers (Cloudflare/Vercel)
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
        caches: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // 7) Tests (Jest)
  {
    files: ["**/*.test.*", "**/__tests__/**"],
    languageOptions: { globals: { ...globals.jest } },
  },
];
