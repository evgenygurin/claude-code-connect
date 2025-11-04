#!/bin/bash

# ================================================================================
# Codegen CircleCI Integration Setup Script
# ================================================================================
# This script automates Codegen + CircleCI integration setup
#
# Prerequisites:
# - Codegen API token (get from: https://codegen.com/settings)
# - CircleCI API token (get from: https://app.circleci.com/settings/user/tokens)
# - jq installed for JSON processing
#
# Usage:
#   export CODEGEN_API_TOKEN="your_codegen_token"
#   export CIRCLECI_TOKEN="your_circleci_token"
#   ./scripts/setup-codegen-circleci.sh
# ================================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CODEGEN_API_BASE="https://api.codegen.com/v1"
CIRCLECI_API_BASE="https://circleci.com/api/v2"
CODEGEN_WEBHOOK_URL="https://api.codegen.com/webhooks/circleci"

# ================================================================================
# Helper Functions
# ================================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    log_info "Checking dependencies..."

    local missing_deps=()

    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi

    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        echo ""
        echo "Install with:"
        echo "  sudo apt-get install ${missing_deps[*]}"
        exit 1
    fi

    log_success "All dependencies installed"
}

check_tokens() {
    local missing_tokens=()

    if [ -z "${CODEGEN_API_TOKEN:-}" ]; then
        missing_tokens+=("CODEGEN_API_TOKEN")
    fi

    if [ -z "${CIRCLECI_TOKEN:-}" ]; then
        missing_tokens+=("CIRCLECI_TOKEN")
    fi

    if [ ${#missing_tokens[@]} -gt 0 ]; then
        log_error "Missing environment variables: ${missing_tokens[*]}"
        echo ""
        echo "Set your tokens:"
        echo "  export CODEGEN_API_TOKEN='your_codegen_token'"
        echo "  export CIRCLECI_TOKEN='your_circleci_token'"
        echo ""
        echo "Get tokens from:"
        echo "  - Codegen: https://codegen.com/settings"
        echo "  - CircleCI: https://app.circleci.com/settings/user/tokens"
        exit 1
    fi

    log_success "All tokens found"
}

get_repo_info() {
    log_info "Detecting repository information..."

    if git remote -v &> /dev/null; then
        local remote_url=$(git remote get-url origin 2>/dev/null || echo "")

        if [[ $remote_url =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
            ORG="${BASH_REMATCH[1]}"
            REPO="${BASH_REMATCH[2]}"
            log_success "Detected repository: $ORG/$REPO"
            return 0
        fi
    fi

    log_error "Unable to detect repository information"
    exit 1
}

# ================================================================================
# Codegen API Functions
# ================================================================================

codegen_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    local curl_opts=(
        -X "$method"
        -H "Authorization: Bearer $CODEGEN_API_TOKEN"
        -H "Content-Type: application/json"
        -H "Accept: application/json"
        -s -w "\n%{http_code}"
    )

    if [ -n "$data" ]; then
        curl_opts+=(-d "$data")
    fi

    local response=$(curl "${curl_opts[@]}" "$endpoint")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    echo "$http_code|$body"
}

test_codegen_connection() {
    log_info "Testing Codegen API connection..."

    local result=$(codegen_api_call "GET" "$CODEGEN_API_BASE/user")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if [ "$http_code" -eq 200 ]; then
        log_success "Codegen API connection successful"

        local org_name=$(echo "$body" | jq -r '.organization.name // "Unknown"')
        local org_id=$(echo "$body" | jq -r '.organization.id // "Unknown"')
        log_info "Organization: $org_name (ID: $org_id)"

        # Save org ID for later use
        CODEGEN_ORG_ID="$org_id"
        return 0
    else
        log_error "Codegen API connection failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

get_codegen_integrations() {
    log_info "Checking Codegen integrations..."

    local result=$(codegen_api_call "GET" "$CODEGEN_API_BASE/organizations/${CODEGEN_ORG_ID}/integrations")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if [ "$http_code" -eq 200 ]; then
        log_success "Integrations retrieved"

        # Check CircleCI status
        local circleci_status=$(echo "$body" | jq -r '.integrations.circleci.status // "not_configured"')

        if [ "$circleci_status" = "active" ]; then
            log_success "CircleCI integration is active"
            return 0
        else
            log_warning "CircleCI integration status: $circleci_status"
            return 1
        fi
    else
        log_warning "Unable to get integrations (HTTP $http_code)"
        return 1
    fi
}

setup_codegen_circleci_integration() {
    log_info "Setting up CircleCI integration in Codegen..."

    local data=$(jq -n \
        --arg token "$CIRCLECI_TOKEN" \
        '{
            integration_type: "circleci",
            config: {
                api_token: $token,
                auto_fix: true,
                max_retries: 3,
                notify_on_fix: true
            }
        }')

    local result=$(codegen_api_call "POST" "$CODEGEN_API_BASE/organizations/${CODEGEN_ORG_ID}/integrations/circleci" "$data")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        log_success "CircleCI integration configured in Codegen"
        echo "$body" | jq '.'
        return 0
    else
        log_warning "Unable to setup integration via API (HTTP $http_code)"
        log_info "You may need to configure it manually in the Codegen dashboard"
        log_info "Visit: https://codegen.com/settings/integrations/circleci"
        return 1
    fi
}

# ================================================================================
# CircleCI Webhook Functions
# ================================================================================

get_circleci_webhooks() {
    log_info "Checking existing CircleCI webhooks..."

    # Note: CircleCI API v2 has limited webhook support
    # This is a best-effort attempt

    log_warning "CircleCI API v2 doesn't fully support webhook listing"
    log_info "Webhooks must be configured via CircleCI UI"

    return 1
}

display_webhook_instructions() {
    echo ""
    echo "========================================="
    echo "  Manual Webhook Setup Required"
    echo "========================================="
    echo ""
    log_warning "CircleCI webhooks must be configured manually"
    echo ""
    echo "Steps:"
    echo ""
    echo "1. Visit CircleCI project webhooks:"
    echo "   https://app.circleci.com/settings/project/github/$ORG/$REPO/webhooks"
    echo ""
    echo "2. Click 'Add Webhook'"
    echo ""
    echo "3. Configure webhook:"
    echo "   - Name: Codegen Auto-fixer"
    echo "   - URL: $CODEGEN_WEBHOOK_URL"
    echo "   - Events:"
    echo "     ✅ workflow-completed"
    echo "     ✅ job-completed"
    echo ""
    echo "4. Click 'Add Webhook'"
    echo ""
    echo "5. Test webhook delivery"
    echo ""
}

# ================================================================================
# Verification Functions
# ================================================================================

verify_setup() {
    log_info "Verifying complete setup..."

    local checks_passed=0
    local checks_total=4

    echo ""

    # Check 1: Codegen connection
    if test_codegen_connection &> /dev/null; then
        log_success "Check 1/4: Codegen connection ✅"
        ((checks_passed++))
    else
        log_error "Check 1/4: Codegen connection ❌"
    fi

    # Check 2: CircleCI integration in Codegen
    if get_codegen_integrations &> /dev/null; then
        log_success "Check 2/4: Codegen CircleCI integration ✅"
        ((checks_passed++))
    else
        log_warning "Check 2/4: Codegen CircleCI integration ⚠️"
    fi

    # Check 3: .codegen/config.yml
    if [ -f ".codegen/config.yml" ] && grep -q "circleci:" ".codegen/config.yml" && grep -q "enabled: true" ".codegen/config.yml"; then
        log_success "Check 3/4: .codegen/config.yml configured ✅"
        ((checks_passed++))
    else
        log_error "Check 3/4: .codegen/config.yml not properly configured ❌"
    fi

    # Check 4: .circleci/config.yml
    if [ -f ".circleci/config.yml" ]; then
        log_success "Check 4/4: .circleci/config.yml exists ✅"
        ((checks_passed++))
    else
        log_error "Check 4/4: .circleci/config.yml missing ❌"
    fi

    echo ""
    log_info "Verification: $checks_passed/$checks_total checks passed"

    if [ $checks_passed -eq $checks_total ]; then
        log_success "All checks passed!"
        return 0
    else
        log_warning "Some checks failed - review setup"
        return 1
    fi
}

# ================================================================================
# Main Setup Flow
# ================================================================================

main() {
    echo ""
    echo "========================================="
    echo "  Codegen + CircleCI Integration Setup"
    echo "========================================="
    echo ""

    # Step 1: Check dependencies
    check_dependencies

    # Step 2: Check tokens
    check_tokens

    # Step 3: Get repository info
    get_repo_info

    echo ""
    log_info "Repository: github/$ORG/$REPO"
    echo ""

    # Step 4: Test Codegen connection
    if ! test_codegen_connection; then
        log_error "Setup aborted: Codegen API connection failed"
        exit 1
    fi

    echo ""

    # Step 5: Check existing integrations
    get_codegen_integrations || true

    echo ""

    # Step 6: Setup CircleCI integration in Codegen
    setup_codegen_circleci_integration || true

    echo ""

    # Step 7: Display webhook setup instructions
    display_webhook_instructions

    # Step 8: Verify complete setup
    echo ""
    verify_setup

    # Final summary
    echo ""
    echo "========================================="
    echo "  Setup Summary"
    echo "========================================="
    echo ""
    log_success "Automated setup completed"
    echo ""
    echo "Next steps:"
    echo "1. ✅ Codegen CircleCI integration configured"
    echo "2. ⚠️  Setup CircleCI webhook manually (see instructions above)"
    echo "3. 🔄 Push code to trigger CircleCI build"
    echo "4. 🤖 Watch Codegen auto-fix in action!"
    echo ""
    echo "Useful links:"
    echo "- Codegen Dashboard: https://codegen.com/settings/integrations"
    echo "- Codegen Runs: https://codegen.com/runs"
    echo "- CircleCI Pipelines: https://app.circleci.com/pipelines/github/$ORG/$REPO"
    echo "- CircleCI Webhooks: https://app.circleci.com/settings/project/github/$ORG/$REPO/webhooks"
    echo ""
}

# ================================================================================
# Script Entry Point
# ================================================================================

main "$@"
