module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { tsconfigRootDir: __dirname, project: ["./tsconfig.base.json"] },
  plugins: ["@typescript-eslint","import"],
  extends: ["eslint:recommended","plugin:@typescript-eslint/recommended","prettier"],
  ignorePatterns: ["dist","node_modules","**/*.d.ts"]
};
