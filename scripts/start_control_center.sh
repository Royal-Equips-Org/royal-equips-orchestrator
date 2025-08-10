#!/usr/bin/env bash
set -euo pipefail

VARIANT="${CONTROL_CENTER_VARIANT:-}"
PORT="${PORT:-8000}"

if [ "$VARIANT" = "classic" ]; then
  exec streamlit run orchestrator/control_center/app.py \
    --server.address=0.0.0.0 \
    --server.port="$PORT" \
    --server.enableCORS=false \
    --server.headless=true
else
  exec streamlit run orchestrator/control_center/holo_app.py \
    --server.address=0.0.0.0 \
    --server.port="$PORT" \
    --server.enableCORS=false \
    --server.headless=true \
    --theme.base=dark
fi