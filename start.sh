#!/usr/bin/env bash
set -euo pipefail

# Robust startup script for Royal Equips Orchestrator
# Auto-detects application type and provides fallbacks
echo "🚀 Royal Equips Orchestrator - Robust Startup v1.0"
echo "=================================================="

# Environment variable overrides
APP_TYPE="${APP_TYPE:-auto}"
APP_PATH="${APP_PATH:-}"
PORT="${PORT:-8000}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-3}"
PROCESS_TIMEOUT="${PROCESS_TIMEOUT:-30}"

export PORT

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting application detection (APP_TYPE=$APP_TYPE, PORT=$PORT)"

# Function to check if a Python module is available
check_module() {
    local module="$1"
    if python -c "import importlib; import sys; sys.exit(0 if importlib.util.find_spec('$module') else 1)" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to check if file exists and contains patterns
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

# Function to start FastAPI application
start_fastapi() {
    local app_path="$1"
    local host="${2:-0.0.0.0}"
    local port="${3:-$PORT}"
    
    log "🔧 Starting FastAPI application: $app_path"
    
    # Try different ways to run FastAPI
    if check_module uvicorn; then
        log "Using uvicorn to serve FastAPI app"
        exec uvicorn "$app_path" --host "$host" --port "$port" --access-log
    elif check_module gunicorn; then
        log "Using gunicorn to serve FastAPI app"
        exec gunicorn "$app_path" --bind "$host:$port" --worker-class uvicorn.workers.UvicornWorker --access-logfile -
    else
        log "❌ No ASGI server available (uvicorn/gunicorn). Cannot start FastAPI app."
        return 1
    fi
}

# Function to start Streamlit application
start_streamlit() {
    local app_path="$1"
    local host="${2:-0.0.0.0}"
    local port="${3:-$PORT}"
    
    log "🎨 Starting Streamlit application: $app_path"
    exec streamlit run "$app_path" --server.address "$host" --server.port "$port" \
         --server.enableCORS=false --server.headless=true
}

# Function to start Flask application  
start_flask() {
    local app_path="$1"
    local host="${2:-0.0.0.0}"
    local port="${3:-$PORT}"
    
    log "🌶️ Starting Flask application: $app_path"
    export FLASK_APP="$app_path"
    exec flask run --host "$host" --port "$port"
}

# Function to start Python module directly
start_python() {
    local app_path="$1"
    log "🐍 Starting Python module: $app_path"
    exec python "$app_path"
}

# Auto-detection logic
detect_and_start() {
    log "🔍 Auto-detecting application type..."
    
    # Check module availability
    has_fastapi=$(check_module fastapi && echo 1 || echo 0)
    has_streamlit=$(check_module streamlit && echo 1 || echo 0)  
    has_flask=$(check_module flask && echo 1 || echo 0)
    has_uvicorn=$(check_module uvicorn && echo 1 || echo 0)
    has_gunicorn=$(check_module gunicorn && echo 1 || echo 0)
    
    log "Available frameworks: FastAPI=$has_fastapi, Streamlit=$has_streamlit, Flask=$has_flask"
    log "Available servers: uvicorn=$has_uvicorn, gunicorn=$has_gunicorn"
    
    # FastAPI candidates (highest priority for production)
    local fastapi_candidates=(
        "api.main:app"
        "orchestrator.api:app"
        "api/main.py"
        "orchestrator/api.py"
        "main.py"
        "app.py"
    )
    
    # Streamlit candidates
    local streamlit_candidates=(
        "orchestrator/control_center/streamlit_app.py"
        "orchestrator/control_center/app.py"
        "orchestrator/app.py"
        "streamlit_app.py"
        "st_app.py"
        "dashboard.py"
    )
    
    # Flask candidates
    local flask_candidates=(
        "app.py"
        "main.py"
        "server.py"
        "web.py"
    )
    
    # Try FastAPI first (production-ready)
    if [[ "$has_fastapi" -eq 1 ]]; then
        log "🔍 Checking FastAPI candidates..."
        
        # Check module-style candidates first
        for candidate in "${fastapi_candidates[@]}"; do
            if [[ "$candidate" =~ : ]]; then
                # Module:app format
                local module="${candidate%:*}"
                local attr="${candidate#*:}"
                if python -c "import importlib; m=importlib.import_module('$module'); getattr(m, '$attr')" >/dev/null 2>&1; then
                    log "✅ Found FastAPI app: $candidate"
                    start_fastapi "$candidate"
                    return $?
                fi
            else
                # File path format
                if check_file_patterns "$candidate" "from fastapi import" "import fastapi" "FastAPI("; then
                    log "✅ Found FastAPI file: $candidate"
                    # Convert to module format
                    local module_path="${candidate%.py}"
                    module_path="${module_path//\//.}"
                    start_fastapi "$module_path:app"
                    return $?
                fi
            fi
        done
    fi
    
    # Try Streamlit if FastAPI not found
    if [[ "$has_streamlit" -eq 1 ]]; then
        log "🔍 Checking Streamlit candidates..."
        
        for candidate in "${streamlit_candidates[@]}"; do
            if check_file_patterns "$candidate" "import streamlit" "from streamlit"; then
                log "✅ Found Streamlit app: $candidate"
                start_streamlit "$candidate"
                return $?
            fi
        done
        
        # Heuristic search for Streamlit files
        log "🔍 Performing heuristic search for Streamlit files..."
        while IFS= read -r filepath; do
            if [[ -n "$filepath" ]] && check_file_patterns "$filepath" "import streamlit" "from streamlit"; then
                log "✅ Found Streamlit app via heuristic: $filepath"
                start_streamlit "$filepath"
                return $?
            fi
        done < <(find . -maxdepth 4 -type f -name "*.py" \
                  \( -path "./.venv/*" -o -path "./venv/*" -o -path "./.git/*" -o -path "./__pycache__/*" \) -prune \
                  -o -name "*.py" -print)
    fi
    
    # Try Flask as fallback
    if [[ "$has_flask" -eq 1 ]]; then
        log "🔍 Checking Flask candidates..."
        
        for candidate in "${flask_candidates[@]}"; do
            if check_file_patterns "$candidate" "from flask import" "import flask" "Flask("; then
                log "✅ Found Flask app: $candidate"
                start_flask "$candidate"
                return $?
            fi
        done
    fi
    
    # Last resort: try to run any Python file with __main__ (excluding test scripts)
    log "🔍 Looking for Python scripts with __main__ (excluding tests)..."
    while IFS= read -r filepath; do
        # Skip test files and integration scripts
        if [[ "$filepath" == *"test"* ]] || [[ "$filepath" == *"_test"* ]] || [[ "$filepath" == *"integration"* ]]; then
            continue
        fi
        
        if [[ -n "$filepath" ]] && check_file_patterns "$filepath" "if __name__ == ['\"]__main__['\"]"; then
            log "✅ Found Python script with __main__: $filepath"
            start_python "$filepath"
            return $?
        fi
    done < <(find . -maxdepth 3 -type f -name "*.py" \
              \( -path "./.venv/*" -o -path "./venv/*" -o -path "./.git/*" -o -path "./__pycache__/*" \) -prune \
              -o -name "*.py" -print)
    
    return 1
}

# Health check function
health_check() {
    local url="${1:-http://localhost:$PORT/health}"
    local retries="${2:-$HEALTH_CHECK_RETRIES}"
    
    log "🏥 Performing health check: $url"
    
    for i in $(seq 1 "$retries"); do
        if curl -s -f "$url" >/dev/null 2>&1; then
            log "✅ Health check passed (attempt $i/$retries)"
            return 0
        elif command -v wget >/dev/null 2>&1 && wget -q --spider "$url" 2>/dev/null; then
            log "✅ Health check passed with wget (attempt $i/$retries)"
            return 0
        else
            log "⏳ Health check failed (attempt $i/$retries), retrying in 5s..."
            sleep 5
        fi
    done
    
    log "❌ Health check failed after $retries attempts"
    return 1
}

# Main execution logic
main() {
    # Handle explicit APP_TYPE override
    case "$APP_TYPE" in
        "fastapi"|"api")
            if [[ -n "$APP_PATH" ]]; then
                log "🎯 Explicit FastAPI mode with path: $APP_PATH"
                start_fastapi "$APP_PATH"
            else
                log "❌ APP_TYPE=fastapi specified but APP_PATH not provided"
                exit 1
            fi
            ;;
        "streamlit"|"st")
            if [[ -n "$APP_PATH" ]]; then
                log "🎯 Explicit Streamlit mode with path: $APP_PATH"
                start_streamlit "$APP_PATH"
            else
                log "❌ APP_TYPE=streamlit specified but APP_PATH not provided"
                exit 1
            fi
            ;;
        "flask")
            if [[ -n "$APP_PATH" ]]; then
                log "🎯 Explicit Flask mode with path: $APP_PATH"
                start_flask "$APP_PATH"
            else
                log "❌ APP_TYPE=flask specified but APP_PATH not provided"
                exit 1
            fi
            ;;
        "python")
            if [[ -n "$APP_PATH" ]]; then
                log "🎯 Explicit Python mode with path: $APP_PATH"
                start_python "$APP_PATH"
            else
                log "❌ APP_TYPE=python specified but APP_PATH not provided"
                exit 1
            fi
            ;;
        "auto"|"")
            log "🤖 Auto-detection mode"
            if detect_and_start; then
                log "✅ Application started successfully"
            else
                log "❌ Auto-detection failed"
                exit 1
            fi
            ;;
        *)
            log "❌ Unknown APP_TYPE: $APP_TYPE"
            log "Valid options: auto, fastapi, streamlit, flask, python"
            exit 1
            ;;
    esac
}

# Error handling
trap 'log "❌ Startup script interrupted or failed"' ERR INT TERM

# Run diagnosis script if available for additional context
if [[ -f "scripts/diagnose_stack.sh" ]]; then
    log "🔍 Running stack diagnosis for additional context..."
    bash scripts/diagnose_stack.sh || true
fi

# Execute main logic
main

log "✅ Startup script completed"