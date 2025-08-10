#!/usr/bin/env bash
set -euo pipefail

VARIANT="${CONTROL_CENTER_VARIANT:-classic}"
PORT="${PORT:-8000}"

# Default to classic app since holo_app.py is no longer available
exec streamlit run orchestrator/control_center/app.py \
  --server.address=0.0.0.0 \
  --server.port="$PORT" \
  --server.enableCORS=false \
  --server.headless=true