// commitlint.config.cjs
module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    // Ignore legacy commits that don't follow conventional commit format
    (message) => message.includes('Initial plan'),
    // Can add more legacy commit patterns here if needed
  ],
  rules: {
    'signed-off-by': [0, 'always'],
    'subject-case': [2, 'always', ['sentence-case', 'lower-case']],
    'body-max-line-length': [2, 'always', 120],
    'footer-max-line-length': [2, 'always', 120],
    'type-enum': [2, 'always', [
      'feat','fix','perf','refactor','docs','test','build','ci','chore','revert','ops','sec'
    ]],
  },
};