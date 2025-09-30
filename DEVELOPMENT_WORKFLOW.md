# 🚀 Development Workflow Guide

## Quick Summary

The repository now supports a **flexible, developer-friendly workflow** that doesn't block development with strict linting/type checking on every push.

## Changes Made ✅

### GitHub Actions (CI/CD)
- **CI now runs only on Pull Requests** and version tags (`v*.*.*`)
- **All checks are non-blocking** - they show warnings but don't fail the build
- **Security scans** still run but ignore documentation changes
- **Manual triggers** available via `workflow_dispatch`

### Git Hooks (Husky)
- **Pre-commit**: Linting is non-blocking, shows warnings
- **Pre-push**: Type checking and tests are non-blocking, show warnings  
- **Easy to skip** with environment variables

### Skip Options Available
```bash
# Skip individual checks
SKIP_LINT=1 git commit -m "quick fix"
SKIP_CHECKS=1 git push
SKIP_HUSKY=1 git commit -m "bypass all hooks"

# Automatically skipped in CI
CI=1 # (set automatically in GitHub Actions)
```

## Recommended Workflows

### 🏃‍♂️ Quick Development (Fast Iteration)
```bash
# Load helpful aliases (optional)
source scripts/git-aliases.sh

# Quick commit + push without any checks
SKIP_LINT=1 git commit -am "wip: quick changes" && SKIP_CHECKS=1 git push

# Or use the convenient alias
gcp-fast  # Quick commit + push
```

### 🛡️ Quality-Focused Development
```bash
# Normal workflow with non-blocking checks
git commit -m "Add new feature"
git push  # Shows warnings but won't fail

# Manual quality check before PR
pnpm lint && pnpm typecheck && pnpm test
```

### 🎯 Production-Ready Development
```bash
# Full quality pipeline (what happens in PR)
pnpm lint --fix
pnpm typecheck  
pnpm test
git commit -m "feat: production-ready feature"
git push
```

## Available Git Aliases

After running `source scripts/git-aliases.sh`:

- `gp-fast` / `gp-quick` - Push without checks
- `gc-fast` / `gc-quick` - Commit without lint  
- `gcp-fast` - Quick commit + push without checks
- `gcp` - Normal commit + push with checks

## When Checks Run

| Event | CI Workflow | Security Scan | Git Hooks |
|-------|------------|---------------|-----------|
| Push to main/master | ❌ No | ✅ Yes | ✅ Yes (skippable) |
| Push to feature branch | ❌ No | ❌ No | ✅ Yes (skippable) |
| Pull Request | ✅ Yes (non-blocking) | ✅ Yes | ✅ Yes (skippable) |
| Version tag (`v*`) | ✅ Yes (non-blocking) | ❌ No | ❌ No |

## Benefits 🎉

1. **Faster development** - No waiting for lint/type checks on every push
2. **Non-blocking warnings** - See issues but still proceed
3. **Easy skip options** - Bypass checks when needed
4. **Quality on PRs** - Full checks run where it matters
5. **Flexible workflow** - Choose your level of checking

## Security & Quality Maintained 🔐

- **Pull Requests** still run full CI pipeline
- **Security scans** continue running on main branches
- **Code quality tools** still available manually
- **Branch protection** rules ensure PR reviews
- **Non-blocking approach** encourages rather than forces quality

---

*This setup makes development smooth and automatic while maintaining code quality where it matters most - during code review and release.*