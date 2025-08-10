#!/usr/bin/env bash
set -euo pipefail

KNOWN_MISSING="orchestrator/control_center/holo_app.py"

check_import() {
  local module="$1"
  if python - <<PY >/dev/null 2>&1
import importlib
import sys
sys.exit(0 if importlib.util.find_spec("$module") else 1)
PY
  then
    echo "✅ Python module available: $module"
    return 0
  else
    echo "❌ Python module NOT found: $module"
    return 1
  fi
}

echo "=== Stack Diagnosis ==="

check_import streamlit || true
check_import fastapi || true
check_import flask || true
check_import uvicorn || true
check_import gunicorn || true

echo
echo "=== Streamlit entrypoint candidates ==="
found_any=0
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
for p in "${candidates[@]}"; do
  if [[ -f "$p" ]]; then
    echo "- ✅ $p"
    found_any=1
  else
    echo "- ❌ $p"
  fi
done

if [[ "$found_any" -eq 0 ]]; then
  echo
  echo "Heuristic search for files importing streamlit (depth<=4):"
  matches=$(grep -RIl --exclude-dir .git --exclude-dir .venv --exclude-dir venv -m 5 -E "^(\s*(from\s+streamlit\s+import|import\s+streamlit)\b)" . || true)
  if [[ -n "${matches:-}" ]]; then
    echo "$matches"
  else
    echo "(none found)"
  fi
fi

echo
echo "=== Validate known missing path from logs ==="
if [[ -f "$KNOWN_MISSING" ]]; then
  echo "- ✅ Exists: $KNOWN_MISSING"
else
  echo "- ❌ Missing: $KNOWN_MISSING"
fi

echo
cat <<'TIP'
TIP: If Streamlit is not present and you see FastAPI/Flask, you likely need a different start command (e.g., uvicorn module:app or gunicorn module:app). If Streamlit is present, use 'streamlit run <entrypoint>'.
TIP