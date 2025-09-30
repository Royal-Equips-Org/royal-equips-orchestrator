#!/usr/bin/env bash
# Git aliases for easier development workflow
# Source this file in your shell profile (~/.bashrc, ~/.zshrc) with:
# source scripts/git-aliases.sh

# Quick push without any checks
alias gp-fast="SKIP_CHECKS=1 git push"
alias gp-quick="SKIP_CHECKS=1 git push"

# Quick commit without lint checks  
alias gc-fast="SKIP_LINT=1 git commit"
alias gc-quick="SKIP_LINT=1 git commit"

# Combined quick commit and push
alias gcp-fast="SKIP_LINT=1 git commit -am 'quick fix' && SKIP_CHECKS=1 git push"

# Normal workflow (with checks)
alias gcp="git commit -am 'update' && git push"

echo "✅ Git aliases loaded:"
echo "  gp-fast / gp-quick    - Push without checks"
echo "  gc-fast / gc-quick    - Commit without lint"  
echo "  gcp-fast              - Quick commit + push without checks"
echo "  gcp                   - Normal commit + push with checks"