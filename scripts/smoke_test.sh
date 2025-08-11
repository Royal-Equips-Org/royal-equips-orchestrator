#!/bin/bash
set -euo pipefail

# Smoke test script for Royal Equips Flask Orchestrator
# Validates core endpoints and exits non-zero on failure

APP_URL="${1:-http://localhost:10000}"
TIMEOUT="${TIMEOUT:-10}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_endpoint() {
    local endpoint="$1"
    local expected_status="${2:-200}"
    local description="$3"
    
    log "Testing $description: $APP_URL$endpoint"
    
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$APP_URL$endpoint" || echo "000")
    
    if [[ "$status_code" != "$expected_status" ]]; then
        log "❌ FAIL: $description - Expected $expected_status, got $status_code"
        return 1
    else
        log "✅ PASS: $description"
        return 0
    fi
}

check_endpoint_content() {
    local endpoint="$1"
    local expected_content="$2"
    local description="$3"
    
    log "Testing $description: $APP_URL$endpoint"
    
    local response
    response=$(curl -s --max-time "$TIMEOUT" "$APP_URL$endpoint" || echo "ERROR")
    
    if [[ "$response" == "ERROR" ]]; then
        log "❌ FAIL: $description - Request failed"
        return 1
    elif [[ "$response" != *"$expected_content"* ]]; then
        log "❌ FAIL: $description - Expected content '$expected_content' not found"
        log "Response: $response"
        return 1
    else
        log "✅ PASS: $description"
        return 0
    fi
}

check_json_endpoint() {
    local endpoint="$1"
    local expected_key="$2"
    local description="$3"
    
    log "Testing $description: $APP_URL$endpoint"
    
    local response
    response=$(curl -s --max-time "$TIMEOUT" "$APP_URL$endpoint" || echo "ERROR")
    
    if [[ "$response" == "ERROR" ]]; then
        log "❌ FAIL: $description - Request failed"
        return 1
    elif ! echo "$response" | jq -e ".$expected_key" >/dev/null 2>&1; then
        log "❌ FAIL: $description - Expected JSON key '$expected_key' not found"
        log "Response: $response"
        return 1
    else
        log "✅ PASS: $description"
        return 0
    fi
}

log "🚀 Starting smoke tests for Royal Equips Flask Orchestrator"
log "Target URL: $APP_URL"
log "Timeout: ${TIMEOUT}s"

# Track overall success
overall_success=0

# Test health endpoints
check_endpoint_content "/healthz" "ok" "Health check (liveness)" || overall_success=1
check_json_endpoint "/readyz" "ready" "Readiness check" || overall_success=1

# Test core functionality  
check_json_endpoint "/" "service" "Root endpoint" || overall_success=1
check_json_endpoint "/metrics" "backend" "Metrics endpoint" || overall_success=1

# Test redirects
check_endpoint "/command-center" "307" "Command center redirect" || overall_success=1
check_endpoint "/control-center" "307" "Control center alias redirect" || overall_success=1

# Test API endpoints
check_json_endpoint "/docs" "endpoints" "API documentation" || overall_success=1
check_json_endpoint "/jobs" "jobs" "Jobs listing" || overall_success=1

# Test agent endpoints
log "Testing agent session creation"
session_response=$(curl -s --max-time "$TIMEOUT" -X POST "$APP_URL/agents/session" || echo "ERROR")
if [[ "$session_response" == "ERROR" ]]; then
    log "❌ FAIL: Agent session creation - Request failed"
    overall_success=1
elif ! echo "$session_response" | jq -e ".session_id" >/dev/null 2>&1; then
    log "❌ FAIL: Agent session creation - No session_id in response"
    overall_success=1
else
    log "✅ PASS: Agent session creation"
    
    # Test sending message to session
    session_id=$(echo "$session_response" | jq -r ".session_id")
    message_payload='{"session_id":"'$session_id'","role":"user","content":"test message"}'
    
    log "Testing agent message sending"
    message_response=$(curl -s --max-time "$TIMEOUT" -X POST \
        -H "Content-Type: application/json" \
        -d "$message_payload" \
        "$APP_URL/agents/message" || echo "ERROR")
    
    if [[ "$message_response" == "ERROR" ]]; then
        log "❌ FAIL: Agent message sending - Request failed"
        overall_success=1
    elif ! echo "$message_response" | jq -e ".status" >/dev/null 2>&1; then
        log "❌ FAIL: Agent message sending - No status in response"
        overall_success=1
    else
        log "✅ PASS: Agent message sending"
    fi
fi

# Test event creation
log "Testing event creation"
event_payload='{"event_type":"smoke_test","data":{"test":true}}'
event_response=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Content-Type: application/json" \
    -d "$event_payload" \
    "$APP_URL/events" || echo "ERROR")

if [[ "$event_response" == "ERROR" ]]; then
    log "❌ FAIL: Event creation - Request failed"
    overall_success=1
elif ! echo "$event_response" | jq -e ".status" >/dev/null 2>&1; then
    log "❌ FAIL: Event creation - No status in response"
    overall_success=1
else
    log "✅ PASS: Event creation"
fi

# Final result
if [[ $overall_success -eq 0 ]]; then
    log "🎉 All smoke tests passed!"
    exit 0
else
    log "💥 Some smoke tests failed!"
    exit 1
fi