#!/usr/bin/env bash
set -e

# Pre-commit hook for Royal Equips Flask Orchestrator
# Ensures code quality before commits

echo "🔍 Running pre-commit checks..."

# Check if we're in the right directory
if [[ ! -f "wsgi.py" ]]; then
    echo "❌ Error: Must be run from repository root"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install required tools if missing
install_tools() {
    echo "📦 Checking required tools..."
    
    if ! command_exists black; then
        echo "Installing black..."
        pip install black
    fi
    
    if ! command_exists ruff; then
        echo "Installing ruff..."
        pip install ruff
    fi
    
    if ! command_exists pytest; then
        echo "Installing pytest..."
        pip install pytest
    fi
}

# Format code with Black
format_code() {
    echo "🎨 Formatting code with Black..."
    if ! black --check app/ wsgi.py tests/test_flask_app.py --quiet; then
        echo "📝 Auto-formatting code..."
        black app/ wsgi.py tests/test_flask_app.py
        echo "✅ Code formatted"
    else
        echo "✅ Code already formatted"
    fi
}

# Lint code with Ruff
lint_code() {
    echo "🔍 Linting code with Ruff..."
    if ! ruff check app/ --quiet; then
        echo "🔧 Attempting to fix lint issues..."
        if ruff check app/ --fix --quiet; then
            echo "✅ Lint issues auto-fixed"
        else
            echo "❌ Lint issues require manual fix"
            ruff check app/
            exit 1
        fi
    else
        echo "✅ No lint issues found"
    fi
}

# Run tests
run_tests() {
    echo "🧪 Running Flask tests..."
    if ! python -m pytest tests/test_flask_app.py -v --tb=short; then
        echo "❌ Tests failed"
        exit 1
    else
        echo "✅ All tests passed"
    fi
}

# Check Flask app can be imported
check_imports() {
    echo "📥 Checking Flask app imports..."
    if ! python -c "from app import create_app; app = create_app(); print('✅ Flask app imports successfully')"; then
        echo "❌ Flask app import failed"
        exit 1
    fi
    
    if ! python -c "from wsgi import app; print('✅ WSGI app imports successfully')"; then
        echo "❌ WSGI app import failed"
        exit 1
    fi
}

# Run security checks
run_security_checks() {
    echo "🔒 Running security checks..."
    
    # Check for Gitleaks
    if command_exists gitleaks; then
        echo "🕵️  Scanning for secrets with Gitleaks..."
        if ! gitleaks protect --staged --verbose; then
            echo "❌ SECURITY ALERT: Secrets detected!"
            echo "   Please remove hardcoded secrets and use environment variables."
            echo "   See .env.example for proper secret management patterns."
            exit 1
        else
            echo "✅ No secrets detected"
        fi
    else
        echo "⚠️  Gitleaks not installed - skipping secret detection"
        echo "   Install gitleaks for enhanced security: https://github.com/gitleaks/gitleaks"
    fi
    
    # Run bandit for Python security issues if available
    if command_exists bandit; then
        echo "🛡️  Running Bandit security scan..."
        if ! bandit -r app/ -f json -o /tmp/bandit-report.json --quiet; then
            echo "⚠️  Security issues found in code"
            bandit -r app/ --severity-level medium
        else
            echo "✅ No security issues found"
        fi
    fi
}
run_smoke_test() {
    echo "🔥 Running quick smoke test..."
    
    # Start Flask app in background
    python wsgi.py &
    APP_PID=$!
    
    # Wait for app to start
    sleep 3
    
    # Check if app is responding
    if curl -f http://localhost:10000/healthz --max-time 5 >/dev/null 2>&1; then
        echo "✅ Smoke test passed"
        SUCCESS=true
    else
        echo "❌ Smoke test failed - app not responding"
        SUCCESS=false
    fi
    
    # Clean up
    kill $APP_PID >/dev/null 2>&1 || true
    sleep 1
    
    if [[ "$SUCCESS" != "true" ]]; then
        exit 1
    fi
}

# Main execution
main() {
    install_tools
    run_security_checks  # Security first!
    format_code
    lint_code
    check_imports
    run_tests
    
    # Only run smoke test if not in CI (to avoid port conflicts)
    if [[ -z "${CI:-}" ]]; then
        run_smoke_test
    fi
    
    echo ""
    echo "🎉 All pre-commit checks passed!"
    echo "   Code is ready for commit."
    echo ""
}

# Run main function
main "$@"