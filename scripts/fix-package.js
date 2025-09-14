const fs = require("fs");
const f = "package.json";

let raw = "";
if (fs.existsSync(f)) raw = fs.readFileSync(f, "utf8");
// strip UTF-8 BOM
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

let j = {};
if (raw.trim()) j = JSON.parse(raw);

j.engines = { ...(j.engines || {}), node: "20" };
j.scripts = {
  ...(j.scripts || {}),
  "husky:install": "husky install",
  "husky:verify": "node -e \"require('fs').accessSync('.husky/pre-commit')\"",
  lint: j.scripts && j.scripts.lint ? j.scripts.lint : "eslint .",
  test: j.scripts && j.scripts.test ? j.scripts.test : "jest --runInBand",
};

fs.writeFileSync(f, JSON.stringify(j, null, 2), "utf8");
console.log("✅ package.json patched");
