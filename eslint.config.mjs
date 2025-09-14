import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // Globale ignores
  {
    ignores: [
      "node_modules/**","dist/**","build/**","coverage/**","vendor/**",
      "**/*.min.js","app/static/assets/**","app/static/react-vendor*.js",
      "dashboard/.next/**","dashboard/dist/**",
      "tools/royal-fix-agent/**",
      "packages/shared/websocket/**" // laat staan als je soms die map mist
    ],
  },

  // Basis JS-regels
  js.configs.recommended,

  // TypeScript (type-aware) — gebruikt base + tests tsconfig
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["**/*.ts","**/*.tsx"],
    languageOptions: {
      ...cfg.languageOptions,
      sourceType: "module",
      parserOptions: {
        project: ["./tsconfig.base.json","./tsconfig.tests.json"],
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      ...cfg.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
    },
  })),

  // Node / scripts
  {
    files: ["**/*.{js,cjs,mjs}","scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2021, console: "readonly" },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // Browser / dashboard
  {
    files: ["dashboard/**/*.{js,ts,jsx,tsx}","public/**/*.{js,jsx}"],
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

  // Edge/Workers
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
      "no-unused-vars": ["off"],
    },
  },

  // Tests (Jest)
  {
    files: ["**/*.test.*","**/__tests__/**","tests/**/*"],
    languageOptions: { globals: { ...globals.jest } },
  },

  // Specifiek: legacy 'c' param in src/index.js
  {
    files: ["src/index.js"],
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^(?:_|c)$", varsIgnorePattern: "^_" }]
    }
  },
];
