#!/usr/bin/env bash
set -euo pipefail

# Comprehensive stack diagnosis for Royal Equips Orchestrator
echo "🔍 Royal Equips Orchestrator - Stack Diagnosis v2.0"
echo "=================================================="

KNOWN_MISSING="orchestrator/control_center/holo_app.py"

# Logging function
log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

# Function to check Python module availability
check_import() {
  local module="$1"
  local version_cmd="$2"
  
  if python - <<PY >/dev/null 2>&1
import importlib
import sys
sys.exit(0 if importlib.util.find_spec("$module") else 1)
PY
  then
    local version=""
    if [[ -n "$version_cmd" ]]; then
      version=$(python -c "$version_cmd" 2>/dev/null || echo "unknown")
      echo "✅ $module ($version)"
    else
      echo "✅ $module"
    fi
    return 0
  else
    echo "❌ $module"
    return 1
  fi
}

# Function to check file patterns
check_file_patterns() {
    local file="$1"
    shift
    local patterns=("$@")
    
    if [[ ! -f "$file" ]]; then
        return 1
    fi
    
    for pattern in "${patterns[@]}"; do
        if grep -Eq "$pattern" "$file"; then
            return 0
        fi
    done
    return 1
}

# Function to analyze file for framework indicators
analyze_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        return 1
    fi
    
    local indicators=()
    
    if grep -Eq "(from fastapi import|import fastapi|FastAPI\()" "$file"; then
        indicators+=("FastAPI")
    fi
    
    if grep -Eq "(from streamlit import|import streamlit)" "$file"; then
        indicators+=("Streamlit")
    fi
    
    if grep -Eq "(from flask import|import flask|Flask\()" "$file"; then
        indicators+=("Flask")
    fi
    
    if grep -Eq "(from django|import django)" "$file"; then
        indicators+=("Django")
    fi
    
    if grep -Eq "if __name__ == ['\"]__main__['\"]" "$file"; then
        indicators+=("Runnable")
    fi
    
    if [[ ${#indicators[@]} -gt 0 ]]; then
        echo "- ✅ $file [$(IFS=','; echo "${indicators[*]}")]"
        return 0
    fi
    
    return 1
}

log "System Environment Check"
echo "Python: $(python --version 2>&1)"
echo "Platform: $(uname -s -m)"
echo "PWD: $(pwd)"

echo
log "Framework and Server Dependencies"
check_import streamlit "import streamlit; print(f'v{streamlit.__version__}')" || true
check_import fastapi "import fastapi; print(f'v{fastapi.__version__}')" || true  
check_import flask "import flask; print(f'v{flask.__version__}')" || true
check_import django "import django; print(f'v{django.get_version()}')" || true
check_import uvicorn "import uvicorn; print(f'v{uvicorn.__version__}')" || true
check_import gunicorn "import gunicorn; print(f'v{gunicorn.__version__}')" || true

echo
log "Environment Variables"
echo "PORT: ${PORT:-not set}"
echo "APP_TYPE: ${APP_TYPE:-not set}" 
echo "APP_PATH: ${APP_PATH:-not set}"
echo "RENDER: ${RENDER:-not set}"
echo "NODE_ENV: ${NODE_ENV:-not set}"

echo
log "Repository Structure Analysis"
echo "Key directories:"
for dir in api orchestrator scripts admin tests; do
    if [[ -d "$dir" ]]; then
        echo "- ✅ $dir/ ($(find "$dir" -name "*.py" | wc -l) Python files)"
    else
        echo "- ❌ $dir/"
    fi
done

echo
log "FastAPI Application Candidates"
fastapi_found=0

# Check module-style candidates
candidates_module=(
    "api.main:app"
    "orchestrator.api:app"
    "scripts.launch_api:app"
    "orchestrator.core.api:app"
    "orchestrator.main:app"
)

for candidate in "${candidates_module[@]}"; do
    module="${candidate%:*}"
    attr="${candidate#*:}"
    if python -c "import importlib; m=importlib.import_module('$module'); getattr(m, '$attr')" >/dev/null 2>&1; then
        echo "- ✅ $candidate (importable)"
        fastapi_found=1
    else
        echo "- ❌ $candidate"
    fi
done

# Check file-based candidates
candidates_file=(
    "api/main.py"
    "orchestrator/api.py"
    "main.py"
    "app.py"
    "server.py"
)

echo
log "Application Files Analysis"
for file in "${candidates_file[@]}"; do
    analyze_file "$file" || echo "- ❌ $file"
done

echo
log "Streamlit Application Candidates"  
streamlit_found=0
streamlit_candidates=(
  "orchestrator/control_center/holo_app.py"
  "orchestrator/control_center/streamlit_app.py"
  "orchestrator/control_center/app.py"
  "orchestrator/holo_app.py"
  "orchestrator/app.py"
  "streamlit_app.py"
  "st_app.py"
  "dashboard.py"
)

for candidate in "${streamlit_candidates[@]}"; do
  if [[ -f "$candidate" ]] && check_file_patterns "$candidate" "import streamlit" "from streamlit"; then
    echo "- ✅ $candidate"
    streamlit_found=1
  else
    echo "- ❌ $candidate"
  fi
done

if [[ "$streamlit_found" -eq 0 ]]; then
  echo
  log "Heuristic search for Streamlit files (depth ≤ 4)"
  while IFS= read -r filepath; do
    if [[ -n "$filepath" ]] && check_file_patterns "$filepath" "import streamlit" "from streamlit"; then
        echo "- 🔍 $filepath (found via heuristic)"
        streamlit_found=1
    fi
  done < <(find . -maxdepth 4 -type f -name "*.py" \
            \( -path "./.venv/*" -o -path "./venv/*" -o -path "./.git/*" -o -path "./__pycache__/*" \) -prune \
            -o -name "*.py" -print)
  
  if [[ "$streamlit_found" -eq 0 ]]; then
      echo "- No Streamlit files found"
  fi
fi

echo
log "Known Issues Validation"
if [[ -f "$KNOWN_MISSING" ]]; then
  echo "- ✅ $KNOWN_MISSING exists"
else
  echo "- ❌ $KNOWN_MISSING is missing (expected from logs)"
fi

# Check React/Node.js admin panel  
if [[ -d "admin" ]] && [[ -f "admin/package.json" ]]; then
    echo "- ✅ React admin panel detected (admin/package.json)"
else
    echo "- ❌ No React admin panel found"
fi

echo
log "Port and Service Analysis"
echo "Default PORT: ${PORT:-8000}"

# Check if anything is running on common ports
for port in 8000 8080 8501 3000; do
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i ":$port" >/dev/null 2>&1; then
            echo "- ⚠️  Port $port is in use"
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -ln 2>/dev/null | grep -q ":$port "; then
            echo "- ⚠️  Port $port is in use"  
        fi
    fi
done

echo
log "Deployment Recommendation"
echo "================================"

if [[ "$fastapi_found" -eq 1 ]]; then
    echo "🚀 RECOMMENDED: Use FastAPI"
    echo "   - Production-ready ASGI application"
    echo "   - Set APP_TYPE=fastapi"
    echo "   - Example: uvicorn api.main:app --host 0.0.0.0 --port \$PORT"
elif [[ "$streamlit_found" -eq 1 ]]; then
    echo "🎨 ALTERNATIVE: Use Streamlit"  
    echo "   - Interactive dashboard application"
    echo "   - Set APP_TYPE=streamlit"
    echo "   - Example: streamlit run app.py --server.port \$PORT"
else
    echo "❌ ISSUE: No suitable application entrypoint found"
    echo "   - Check your dependencies and application files"
    echo "   - Ensure FastAPI or Streamlit apps are properly structured"
fi

echo
log "Files to check for debugging:"
echo "- start.sh (startup script)"
echo "- requirements.txt or pyproject.toml (dependencies)"  
echo "- render.yaml (deployment config)"
echo "- Dockerfile (if using containers)"

echo
log "Stack diagnosis completed"