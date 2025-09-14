// scripts/fix-package.js
const fs = require("fs");
const f = "package.json";

let j = {};
if (fs.existsSync(f)) {
  j = JSON.parse(fs.readFileSync(f, "utf8"));
}

j.engines = { ...(j.engines || {}), node: "20" };
j.scripts = {
  ...(j.scripts || {}),
  "husky:install": "husky install",
  "husky:verify": "node -e \"require('fs').accessSync('.husky/pre-commit')\"",
  lint: j.scripts?.lint || "eslint .",
  test: j.scripts?.test || "jest --runInBand"
};

fs.writeFileSync(f, JSON.stringify(j, null, 2));
console.log("✅ package.json patched successfully");
