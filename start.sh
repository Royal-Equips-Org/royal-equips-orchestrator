#!/usr/bin/env bash
set -euo pipefail

echo "Starting application..."

: "${PORT:=8501}"
export PORT

# Check if streamlit is available
if python - <<'PY' >/dev/null 2>&1
import importlib
import sys
sys.exit(0 if importlib.util.find_spec('streamlit') else 1)
PY
then
  has_streamlit=1
else
  has_streamlit=0
fi

candidates=(
  "orchestrator/control_center/holo_app.py"
  "orchestrator/control_center/streamlit_app.py"
  "orchestrator/control_center/app.py"
  "orchestrator/holo_app.py"
  "orchestrator/app.py"
  "streamlit_app.py"
  "app.py"
  "main.py"
)

target=""
if [[ "$has_streamlit" -eq 1 ]]; then
  # First, try common filenames
  for path in "${candidates[@]}"; do
    if [[ -f "$path" ]]; then
      target="$path"
      break
    fi
  done
  # If not found, heuristically search for any file that imports streamlit AND has a main section
  if [[ -z "$target" ]]; then
    # Search up to 4 levels deep, ignore typical virtualenvs
    while IFS= read -r fp; do
      if grep -Eq "^\s*(from\s+streamlit\s+import|import\s+streamlit)\b" "$fp" && \
         grep -q "__main__" "$fp"; then
        target="$fp"; break
      fi
    done < <(find . -maxdepth 4 -type f -name "*.py" \( -path "./.venv/*" -o -path "./venv/*" -o -path "./.git/*" \) -prune -o -name "*.py" -print)
  fi
fi

if [[ -n "$target" ]]; then
  echo "Found Streamlit entrypoint: $target"
  exec streamlit run "$target" --server.address 0.0.0.0 --server.port "$PORT"
fi

echo "ERROR: Could not find a valid Streamlit entrypoint to run."
echo "- The previous deploy referenced: orchestrator/control_center/holo_app.py (which no longer exists)."
echo "- Streamlit may have been removed during the new Control Center work, or the app moved."
echo "Run scripts/diagnose_stack.sh locally or in the Render shell to confirm what stack is present and what to run."
exit 1