const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");

module.exports = [
  // 0) Ignoreren van build/minified of vendored bundles
  { ignores: [
      "**/.*", "dist/**", "build/**",
      // ignore zware bundels of ge-minifieerde files:
      "src/index.js", "vendor/**", "**/*.min.js"
    ]
  },

  // 1) Config files in CJS-omgeving
  {
    files: ["*.config.cjs", "commitlint.config.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      parser: tsParser,
      globals: globals.node
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off"
    }
  },

  // 2) Node-omgeving (scripts, packages)
  {
    files: ["scripts/**/*.js", "packages/**/*.{ts,tsx,js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      globals: globals.node
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      // versoepel TS lint waar nodig
      "@typescript-eslint/no-explicit-any": "off"
    }
  },

  // 3) Edge/browser omgeving (edge-functions + src webcode)
  {
    files: ["edge-functions/**/*.js", "src/**/*.{js,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      // combineer browser + worker globals (Response, fetch, URL, TextEncoder, etc.)
      globals: { ...globals.browser, ...globals.worker }
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,

      // Los jouw fouttypes op:
      "no-undef": "off",                                  // Response/fetch/URL/… bestaan in edge
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-expressions": "off",  // veel short-circuit/mini code
      "no-empty": "off",
      "no-case-declarations": "off",
      "no-prototype-builtins": "off",
      "no-useless-escape": "off"
    }
  },

  // 4) Linter options
  {
    linterOptions: {
      reportUnusedDisableDirectives: "warn"
    }
  }
];
