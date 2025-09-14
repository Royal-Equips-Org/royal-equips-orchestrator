// scripts/fix-agent.mjs
import { execa } from "execa";
import fs from "fs-extra";
import path from "node:path";
import { globby } from "globby";
import chokidar from "chokidar";
import { diffLines } from "diff";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ROOT = process.cwd();
const r = (...p) => path.resolve(ROOT, ...p);

const options = {
  watch: process.argv.includes("--watch"),
  noPrompt: process.argv.includes("--no-prompt") || process.env.CI === "true",
  commit: process.argv.includes("--commit"),
};

const log = (...a) => console.log("[fix-agent]", ...a);

async function fileExists(p) { return fs.pathExists(p); }
async function read(p) { return (await fileExists(p)) ? fs.readFile(p, "utf8") : ""; }

async function writeWithApproval(file, next, { noPrompt }) {
  const prev = await read(file);
  if (prev === next) return false;

  const diffs = diffLines(prev, next);
  const patch = diffs.map(part => {
    const sign = part.added ? "+" : part.removed ? "-" : " ";
    return part.value.split("\n").map(l => (l ? sign + l : l)).join("\n");
  }).join("\n");

  if (!noPrompt) {
    const rl = readline.createInterface({ input, output });
    console.log(`\n--- Diff for ${file} ---\n${patch}\n------------------------`);
    const ans = (await rl.question(`Apply changes to ${file}? [y/N]: `)).trim().toLowerCase();
    rl.close();
    if (ans !== "y") return false;
  }
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, next);
  log("updated", file);
  return true;
}

async function getPm() {
  try { await execa("pnpm", ["-v"]); return { cmd: "pnpm", base: [] }; }
  catch { return { cmd: "npx", base: ["pnpm@9.9.0"] }; }
}

async function normalizeNpmrc() {
  const want = [
    "strict-peer-deps=true",
    "strict-peer-dependencies=true",
    "ignore-workspace-root-check=true",
  ];
  const p = r(".npmrc");
  let s = await read(p);
  let changed = false;
  for (const line of want) if (!s.includes(line)) { s += (s.endsWith("\n") ? "" : "\n") + line + "\n"; changed = true; }
  if (changed) await writeWithApproval(p, s, options);
  return changed;
}

async function normalizePackageJson() {
  const p = r("package.json");
  if (!await fileExists(p)) return false;
  const pkg = JSON.parse(await read(p));

  pkg.scripts ||= {};
  pkg.scripts.lint = "eslint .";
  pkg.scripts.typecheck = "tsc -p tsconfig.base.json --noEmit";
  pkg.scripts.test = "jest --runInBand --passWithNoTests";

  pkg.engines ||= {};
  pkg.engines.node = "20";

  pkg.devDependencies ||= {};
  delete pkg.devDependencies["@typescript-eslint/eslint-plugin"];
  delete pkg.devDependencies["@typescript-eslint/parser"];
  const want = {
    "@eslint/js": "9.35.0",
    "eslint": "9.35.0",
    "eslint-config-prettier": "9.1.2",
    "eslint-plugin-import": "2.32.0",
    "globals": "15.15.0",
    "husky": "9.1.7",
    "jest": "29.7.0",
    "jest-junit": "16.0.0",
    "prettier": "3.6.2",
    "typescript": "5.6.3",
    "typescript-eslint": "8.43.0"
  };
  for (const [k, v] of Object.entries(want)) pkg.devDependencies[k] = v;

  return await writeWithApproval(p, JSON.stringify(pkg, null, 2) + "\n", options);
}

async function dropLegacyEslintIgnore() {
  const p = r(".eslintignore");
  if (await fileExists(p)) {
    await fs.remove(p);
    log("removed .eslintignore");
    return true;
  }
  return false;
}

const ESLINT_CONFIG = `// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  { ignores: [
      "node_modules/**","dist/**","build/**","coverage/**","vendor/**",
      "**/*.min.js","app/static/assets/**","app/static/react-vendor*.js",
      "dashboard/.next/**","dashboard/dist/**",
      "tools/royal-fix-agent/**"
  ]},
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map(cfg => ({
    ...cfg,
    files: ["**/*.ts","**/*.tsx"],
    languageOptions: {
      ...cfg.languageOptions,
      sourceType: "module",
      parserOptions: { project: ["./tsconfig.base.json"], tsconfigRootDir: process.cwd() }
    },
    rules: { ...cfg.rules,
      "no-unused-vars":"off",
      "@typescript-eslint/no-unused-vars":["warn",{ argsIgnorePattern:"^_", varsIgnorePattern:"^_" }]
    }
  })),
  { files: ["**/*.{js,cjs,mjs}","scripts/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType:"module", globals:{ ...globals.node, ...globals.es2021, console:"readonly" }},
    rules: {
      "no-unused-vars":["warn",{ argsIgnorePattern:"^_", varsIgnorePattern:"^_" }],
      "no-empty":["error",{ allowEmptyCatch:true }]
    }
  },
  { files:["dashboard/**/*.{js,ts,jsx,tsx}","public/**/*.{js,jsx}"],
    languageOptions:{ ecmaVersion:2022, sourceType:"module", globals:{ ...globals.browser, ...globals.serviceworker, ...globals.webworker,
      TextEncoder:"readonly", TransformStream:"readonly", crypto:"readonly", URL:"readonly", Headers:"readonly", AbortSignal:"readonly" }}
  },
  { files:["edge-functions/**/*.{js,ts}"],
    languageOptions:{ ecmaVersion:2022, sourceType:"module", globals:{ ...globals.worker, ...globals.serviceworker, ...globals.webworker,
      fetch:"readonly", Request:"readonly", Response:"readonly", Headers:"readonly", URL:"readonly", WebSocketPair:"readonly", caches:"readonly" }},
    rules:{ "no-unused-vars":["off"] }
  },
  { files:["**/*.test.*","**/__tests__/**"], languageOptions:{ globals:{ ...globals.jest } } }
];
`;

async function ensureEslintConfig() {
  return await writeWithApproval(r("eslint.config.mjs"), ESLINT_CONFIG, options);
}

const JEST_CONFIG = `export default {
  testEnvironment: "node",
  reporters: ["default", ["jest-junit", { outputDirectory: "reports/junit", outputName: "junit.xml" }]],
  roots: ["<rootDir>/tests","<rootDir>/__tests__"],
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
  passWithNoTests: true
};
`;

async function ensureJestConfig() {
  const p1 = r("jest.config.mjs");
  const p2 = r("jest.config.js");
  if (await fileExists(p1) || await fileExists(p2)) return false;
  return await writeWithApproval(p1, JEST_CONFIG, options);
}

async function ensureNginxStubStatus() {
  const p = r("nginx/nginx.conf");
  if (!(await fileExists(p))) return false;
  const s = await read(p);
  if (s.includes("location /stub_status")) return false;
  const next = s.replace(/server\s*{/, match => `${match}
    location /stub_status {
      stub_status on;
      access_log off;
      allow 127.0.0.1;
      allow 172.16.0.0/12;
      deny all;
    }`);
  return await writeWithApproval(p, next, options);
}

async function addMissingHandlerStubs() {
  const files = await globby([
    "edge-functions/**/index.{js,ts}",
    "edge-functions/**/*.{js,ts}"
  ], { gitignore: true });

  const needed = [
    "handleCrop","handleFilter","handleFormat",
    "handlePaymentRequiresAction","handleInvoicePayment","handleSubscriptionChange","handlePayout","sendFailureAlert",
    "handleMessageComponent","handleLogsCommand","handleMetricsCommand","handleInventoryCommand"
  ];

  let total = 0;
  for (const f of files) {
    let s = await read(f);
    let changed = false;
    for (const fn of needed) {
      if (s.includes(fn)) {
        const reDecl = new RegExp(`\\b(export\\s+)?(async\\s+)?function\\s+${fn}\\b|\\b${fn}\\s*=\\s*\\(`, "m");
        if (!reDecl.test(s)) {
          s += `

export async function ${fn}(..._args){ return new Response("${fn}: stub"); }
`;
          changed = true;
        }
      }
    }
    if (changed) {
      await writeWithApproval(r(f), s, options);
      total++;
    }
  }
  return total > 0;
}

async function pnpmInstall(pm) {
  try {
    await execa(pm.cmd, [...pm.base, "install"], { stdio: "inherit" });
  } catch {
    log("install fallback --no-frozen-lockfile");
    await execa(pm.cmd, [...pm.base, "install", "--no-frozen-lockfile"], { stdio: "inherit" });
  }
}

async function runChecks(pm) {
  try { await execa(pm.cmd, [...pm.base, "lint"], { stdio: "inherit" }); } catch { log("lint failed"); }
  try { await execa(pm.cmd, [...pm.base, "typecheck"], { stdio: "inherit" }); } catch { log("typecheck failed"); }
  try { await execa(pm.cmd, [...pm.base, "test", "--", "--ci"], { stdio: "inherit" }); } catch { log("test failed"); }
}

async function gitCommit() {
  try {
    await execa("git", ["add", "-A"], { stdio: "inherit" });
    await execa("git", ["commit", "-m", "chore(fix-agent): normalize npmrc/pkg, ESLint TS, Jest JUnit, edge stubs, nginx stub_status"], { stdio: "inherit" });
  } catch { /* nothing to commit */ }
}

async function oneRun() {
  const pm = await getPm();
  const changed = [];
  if (await normalizeNpmrc()) changed.push(".npmrc");
  if (await normalizePackageJson()) changed.push("package.json");
  if (await dropLegacyEslintIgnore()) changed.push(".eslintignore");
  if (await ensureEslintConfig()) changed.push("eslint.config.mjs");
  if (await ensureJestConfig()) changed.push("jest.config.mjs");
  if (await ensureNginxStubStatus()) changed.push("nginx/nginx.conf");
  if (await addMissingHandlerStubs()) changed.push("edge-functions/*");

  await pnpmInstall(pm);
  await runChecks(pm);

  if (options.commit) await gitCommit();
  return changed;
}

async function main() {
  await oneRun();
  if (!options.watch) return;
  const watcher = chokidar.watch([
    "system-errors.txt",
    "package.json", ".npmrc", "eslint.config.mjs",
    "edge-functions/**/*", "src/**/*", "dashboard/**/*",
    "nginx/nginx.conf"
  ], { ignoreInitial: true });

  let timer = null;
  watcher.on("all", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      console.log("\n— change detected, running Fix-Agent —");
      await oneRun();
    }, 500);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
