#!/usr/bin/env bash
# Git aliases for easier development workflow
# Source this file in your shell profile (~/.bashrc, ~/.zshrc) with:
# source scripts/git-aliases.sh

# Quick push (checks disabled by default, no flag needed)
alias gp-fast="git push"
alias gp-quick="git push"

# Push with quality checks enabled
alias gp-check="RUN_CHECKS=1 git push"

# Quick commit without lint checks  
alias gc-fast="SKIP_LINT=1 git commit"
alias gc-quick="SKIP_LINT=1 git commit"

# Combined quick commit and push (default - no checks)
alias gcp-fast="SKIP_LINT=1 git commit -a && git push"

# Normal workflow (with checks)
alias gcp="git commit -am 'update' && git push"

# Quality-focused workflow (with all checks)
alias gcp-check="git commit -am 'update' && RUN_CHECKS=1 git push"

echo "✅ Git aliases loaded:"
echo "  gp-fast / gp-quick    - Push (checks disabled by default)"
echo "  gp-check              - Push with typecheck/tests enabled"
echo "  gc-fast / gc-quick    - Commit without lint"  
echo "  gcp-fast              - Quick commit + push (no checks)"
echo "  gcp                   - Normal commit + push"
echo "  gcp-check             - Commit + push with all checks"