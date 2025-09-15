#!/usr/bin/env bash
set -euo pipefail
update_file () {
  local f="$1"; [ -f "$f" ] || return 0
  # Check for any header or metadata block in the first 5 lines
    tmpfile="$(mktemp "${f}.XXXXXX")"
    (echo "# Royal Empire — Canonical Knowledge"; echo ""; cat "$f") > "$tmpfile"
    # Preserve permissions and ownership
    chmod --reference="$f" "$tmpfile"
    chown --reference="$f" "$tmpfile"
    mv -f "$tmpfile" "$f"
    (echo "# Royal Empire — Canonical Knowledge"; echo ""; cat "$f") > "$f.tmp" && mv "$f.tmp" "$f"
  fi
  if ! grep -q "^---$" "$f"; then
    printf "\n---\nLast-Upgrade: %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$f"
  fi
  sed -i 's/[ \t]*$//' "$f"
}
for f in INSTRUCTIONS.md EMPIRE_PROMPT.md AGENT_INSTRUCTIONS.md EMPIRE_INFRASTRUCTURE.md .github/COPILOT.md; do
  update_file "$f"
done
