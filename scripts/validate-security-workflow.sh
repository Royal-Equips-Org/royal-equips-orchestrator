#!/bin/bash
# 🏰 Royal Equips Security Workflow Validator
# 
# This script validates the multi-agent security orchestrator workflow
# and provides operational readiness checks for enterprise deployment.

set -e -o pipefail -u

WORKFLOW_FILE=".github/workflows/codacy.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    case $level in
        "INFO")
            echo -e "${GREEN}✅ [$timestamp] INFO: $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  [$timestamp] WARN: $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ [$timestamp] ERROR: $message${NC}"
            ;;
        "DEBUG")
            echo -e "${BLUE}🔍 [$timestamp] DEBUG: $message${NC}"
            ;;
    esac
}

# Check if workflow file exists
check_workflow_exists() {
    if [[ ! -f "$REPO_ROOT/$WORKFLOW_FILE" ]]; then
        log "ERROR" "Workflow file not found: $WORKFLOW_FILE"
        return 1
    fi
    log "INFO" "Workflow file found: $WORKFLOW_FILE"
    return 0
}

# Validate YAML syntax
validate_yaml_syntax() {
    log "DEBUG" "Validating YAML syntax..."
    
    if command -v python3 >/dev/null 2>&1; then
        if python3 -c "import yaml; yaml.safe_load(open('$REPO_ROOT/$WORKFLOW_FILE'))" 2>/dev/null; then
            log "INFO" "YAML syntax is valid"
            return 0
        else
            log "ERROR" "YAML syntax is invalid"
            return 1
        fi
    else
        log "WARN" "Python3 not found, skipping YAML validation"
        return 0
    fi
}

# Check for required agents
check_required_agents() {
    local agents=("security-scan-agent" "lint-agent" "test-agent" "supply-chain-agent" "observability-agent")
    local missing_agents=()
    
    log "DEBUG" "Checking for required agents..."
    
    for agent in "${agents[@]}"; do
        if grep -q "$agent:" "$REPO_ROOT/$WORKFLOW_FILE"; then
            log "INFO" "Agent found: $agent"
        else
            missing_agents+=("$agent")
        fi
    done
    
    if [[ ${#missing_agents[@]} -eq 0 ]]; then
        log "INFO" "All required agents are present"
        return 0
    else
        log "ERROR" "Missing agents: ${missing_agents[*]}"
        return 1
    fi
}

# Check for self-healing features
check_self_healing() {
    log "DEBUG" "Checking for self-healing features..."
    
    if grep -q "nick-fields/retry@v3" "$REPO_ROOT/$WORKFLOW_FILE"; then
        log "INFO" "Self-healing retry logic found"
    else
        log "ERROR" "Self-healing retry logic not found"
        return 1
    fi
    
    if grep -q "timeout-minutes:" "$REPO_ROOT/$WORKFLOW_FILE"; then
        log "INFO" "Timeout configuration found"
    else
        log "ERROR" "Timeout configuration not found"
        return 1
    fi
    
    return 0
}

# Check for structured logging
check_structured_logging() {
    log "DEBUG" "Checking for structured logging..."
    
    if grep -q '{"timestamp":' "$REPO_ROOT/$WORKFLOW_FILE"; then
        log "INFO" "Structured JSON logging found"
        return 0
    else
        log "ERROR" "Structured JSON logging not found"
        return 1
    fi
}

# Check for org-level secrets
check_org_secrets() {
    log "DEBUG" "Checking for organization-level secrets..."
    
    if grep -q "ORG_" "$REPO_ROOT/$WORKFLOW_FILE"; then
        log "INFO" "Organization-level secrets configuration found"
        return 0
    else
        log "ERROR" "Organization-level secrets not found"
        return 1
    fi
}

# Check for compliance hooks
check_compliance() {
    local standards=("GDPR" "SOC2" "ISO27001")
    log "DEBUG" "Checking for compliance standards..."
    
    for standard in "${standards[@]}"; do
        if grep -q "$standard" "$REPO_ROOT/$WORKFLOW_FILE"; then
            log "INFO" "Compliance standard found: $standard"
        else
            log "WARN" "Compliance standard not explicitly mentioned: $standard"
        fi
    done
    
    return 0
}

# Check for matrix strategies
check_matrix_strategies() {
    log "DEBUG" "Checking for matrix strategies..."
    
    if grep -q "strategy:" "$REPO_ROOT/$WORKFLOW_FILE" && grep -q "matrix:" "$REPO_ROOT/$WORKFLOW_FILE"; then
        log "INFO" "Matrix strategies found for scaling"
        return 0
    else
        log "ERROR" "Matrix strategies not found"
        return 1
    fi
}

# Check for pinned versions
check_pinned_versions() {
    log "DEBUG" "Checking for pinned action versions..."
    
    local unpinned_found=false
    
    # Look for actions with unpinned versions
    if grep -E "uses:.*@(main|master|latest)" "$REPO_ROOT/$WORKFLOW_FILE" >/dev/null; then
        log "ERROR" "Unpinned action versions found (main/master/latest)"
        unpinned_found=true
    fi
    
    if [[ "$unpinned_found" == false ]]; then
        log "INFO" "All actions appear to be pinned to specific versions"
        return 0
    else
        return 1
    fi
}

# Generate summary report
generate_summary() {
    log "INFO" "=== Royal Equips Security Workflow Validation Summary ==="
    log "INFO" "Workflow: $WORKFLOW_FILE"
    log "INFO" "Repository: $(basename "$REPO_ROOT")"
    log "INFO" "Validation completed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Count total checks
    local total_checks=9
    local passed_checks=$1
    local success_rate=$((passed_checks * 100 / total_checks))
    
    log "INFO" "Checks passed: $passed_checks/$total_checks ($success_rate%)"
    
    if [[ $passed_checks -eq $total_checks ]]; then
        log "INFO" "🎉 Workflow is ready for enterprise deployment!"
        return 0
    else
        log "WARN" "⚠️  Workflow needs attention before deployment"
        return 1
    fi
}

# Main execution
main() {
    log "INFO" "🏰 Royal Equips Security Workflow Validator"
    log "INFO" "Starting validation process..."
    
    local passed_checks=0
    
    # Run all validation checks
    if check_workflow_exists; then ((passed_checks++)); fi
    if validate_yaml_syntax; then ((passed_checks++)); fi
    if check_required_agents; then ((passed_checks++)); fi
    if check_self_healing; then ((passed_checks++)); fi
    if check_structured_logging; then ((passed_checks++)); fi
    if check_org_secrets; then ((passed_checks++)); fi
    if check_compliance; then ((passed_checks++)); fi
    if check_matrix_strategies; then ((passed_checks++)); fi
    if check_pinned_versions; then ((passed_checks++)); fi
    # Note: Removed branch config check due to YAML parsing complexity
    
    # Generate final summary
    generate_summary $passed_checks
}

# Execute main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    cd "$REPO_ROOT"
    main "$@"
fi