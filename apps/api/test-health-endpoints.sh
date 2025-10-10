#!/usr/bin/env bash
# Manual integration test for health endpoints
# Run this after starting the API server with: npm run dev

set -e

echo "🧪 Testing Health Endpoints"
echo "============================"
echo ""

BASE_URL="${API_BASE_URL:-http://localhost:10000}"

test_endpoint() {
    local endpoint=$1
    local name=$2
    
    echo "Testing $name..."
    
    # Test with curl
    response=$(curl -s -w "\n%{http_code}\n%{content_type}" "$BASE_URL$endpoint")
    
    # Extract HTTP status code and content type
    http_code=$(echo "$response" | tail -2 | head -1)
    content_type=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -2)
    
    # Check HTTP status
    if [ "$http_code" -ne 200 ] && [ "$http_code" -ne 503 ]; then
        echo "  ❌ FAIL: Expected HTTP 200 or 503, got $http_code"
        echo "  Response: $body"
        return 1
    fi
    
    # Check content type
    if [[ ! "$content_type" =~ "application/json" ]]; then
        echo "  ❌ FAIL: Expected application/json, got $content_type"
        echo "  Response: $body"
        return 1
    fi
    
    # Check it's not HTML
    if [[ "$body" =~ "<!DOCTYPE" ]] || [[ "$body" =~ "<html" ]]; then
        echo "  ❌ FAIL: Response contains HTML"
        echo "  Response: $body"
        return 1
    fi
    
    # Verify JSON is valid
    if ! echo "$body" | jq . >/dev/null 2>&1; then
        echo "  ❌ FAIL: Response is not valid JSON"
        echo "  Response: $body"
        return 1
    fi
    
    # Check for required fields
    status=$(echo "$body" | jq -r '.status // empty')
    if [ -z "$status" ]; then
        echo "  ❌ FAIL: Missing 'status' field"
        echo "  Response: $body"
        return 1
    fi
    
    echo "  ✅ PASS: HTTP $http_code, Content-Type: $content_type"
    echo "  Status: $status"
    echo ""
    
    return 0
}

# Test all health endpoints
failed=0

test_endpoint "/health" "GET /health" || failed=$((failed + 1))
test_endpoint "/healthz" "GET /healthz" || failed=$((failed + 1))
test_endpoint "/readyz" "GET /readyz" || failed=$((failed + 1))
test_endpoint "/liveness" "GET /liveness" || failed=$((failed + 1))
test_endpoint "/readiness" "GET /readiness" || failed=$((failed + 1))

# Test with Accept: text/html header to ensure JSON is still returned
echo "Testing with Accept: text/html header..."
response=$(curl -s -H "Accept: text/html" "$BASE_URL/health")
if [[ "$response" =~ "<!DOCTYPE" ]] || [[ "$response" =~ "<html" ]]; then
    echo "  ❌ FAIL: Returned HTML instead of JSON when Accept: text/html"
    failed=$((failed + 1))
else
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo "  ✅ PASS: Returned JSON even with Accept: text/html"
    else
        echo "  ❌ FAIL: Response is not valid JSON"
        failed=$((failed + 1))
    fi
fi
echo ""

# Test /v1/health for backward compatibility
echo "Testing backward compatibility..."
test_endpoint "/v1/health" "GET /v1/health" || failed=$((failed + 1))

echo "============================"
if [ $failed -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ $failed test(s) failed"
    exit 1
fi
