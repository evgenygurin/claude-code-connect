#!/bin/bash

# ================================================================================
# CircleCI Automated Setup Script
# ================================================================================
# This script automates CircleCI project setup using the CircleCI API v2
#
# Prerequisites:
# - CircleCI API token (get from: https://app.circleci.com/settings/user/tokens)
# - GitHub repository with .circleci/config.yml in main/master branch
# - jq installed for JSON processing
#
# Usage:
#   export CIRCLECI_TOKEN="your_token_here"
#   ./scripts/setup-circleci.sh
#
# Or with inline token:
#   CIRCLECI_TOKEN="your_token" ./scripts/setup-circleci.sh
# ================================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CIRCLECI_API_BASE="https://circleci.com/api/v2"
VCS_TYPE="github"
DEFAULT_ORG="evgenygurin"
DEFAULT_REPO="claude-code-connect"

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

    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed. Please install curl."
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. JSON output will be raw."
        log_info "Install jq for better output: sudo apt-get install jq"
    fi

    log_success "Dependencies checked"
}

check_token() {
    if [ -z "${CIRCLECI_TOKEN:-}" ]; then
        log_error "CIRCLECI_TOKEN environment variable not set"
        echo ""
        echo "Get your token from: https://app.circleci.com/settings/user/tokens"
        echo ""
        echo "Then set it:"
        echo "  export CIRCLECI_TOKEN='your_token_here'"
        echo ""
        echo "Or run inline:"
        echo "  CIRCLECI_TOKEN='your_token' $0"
        exit 1
    fi

    log_success "CircleCI token found"
}

get_repo_info() {
    log_info "Detecting repository information..."

    # Try to get from git remote
    if git remote -v &> /dev/null; then
        local remote_url=$(git remote get-url origin 2>/dev/null || echo "")

        if [[ $remote_url =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
            ORG="${BASH_REMATCH[1]}"
            REPO="${BASH_REMATCH[2]}"
            log_success "Detected repository: $ORG/$REPO"
            return 0
        fi
    fi

    # Fallback to defaults
    ORG="${DEFAULT_ORG}"
    REPO="${DEFAULT_REPO}"
    log_warning "Using default repository: $ORG/$REPO"
}

# ================================================================================
# API Functions
# ================================================================================

api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    local curl_opts=(
        -X "$method"
        -H "Circle-Token: $CIRCLECI_TOKEN"
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

# ================================================================================
# CircleCI API Operations
# ================================================================================

test_api_connection() {
    log_info "Testing CircleCI API connection..."

    local result=$(api_call "GET" "$CIRCLECI_API_BASE/me")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if [ "$http_code" -eq 200 ]; then
        log_success "API connection successful"

        if command -v jq &> /dev/null; then
            local name=$(echo "$body" | jq -r '.name // "Unknown"')
            local id=$(echo "$body" | jq -r '.id // "Unknown"')
            log_info "Authenticated as: $name (ID: $id)"
        fi
        return 0
    else
        log_error "API connection failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

check_project_exists() {
    log_info "Checking if project is already set up in CircleCI..."

    # Get project details
    local endpoint="$CIRCLECI_API_BASE/project/$VCS_TYPE/$ORG/$REPO"
    local result=$(api_call "GET" "$endpoint")
    local http_code=$(echo "$result" | cut -d'|' -f1)

    if [ "$http_code" -eq 200 ]; then
        log_success "Project found in CircleCI"
        return 0
    elif [ "$http_code" -eq 404 ]; then
        log_info "Project not found in CircleCI"
        return 1
    else
        log_warning "Unable to determine project status (HTTP $http_code)"
        return 1
    fi
}

follow_project() {
    log_info "Setting up project in CircleCI..."

    # Follow/create project endpoint
    local endpoint="$CIRCLECI_API_BASE/project/$VCS_TYPE/$ORG/$REPO"
    local result=$(api_call "POST" "$endpoint" "{}")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if [ "$http_code" -eq 201 ] || [ "$http_code" -eq 200 ]; then
        log_success "Project successfully set up in CircleCI!"

        if command -v jq &> /dev/null; then
            echo "$body" | jq '.'
        else
            echo "$body"
        fi
        return 0
    else
        log_error "Failed to setup project (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

get_project_settings() {
    log_info "Getting project settings..."

    local endpoint="$CIRCLECI_API_BASE/project/$VCS_TYPE/$ORG/$REPO"
    local result=$(api_call "GET" "$endpoint")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if [ "$http_code" -eq 200 ]; then
        log_success "Project settings retrieved"

        if command -v jq &> /dev/null; then
            echo "$body" | jq '{
                name: .name,
                vcs_url: .vcs_url,
                default_branch: .default_branch,
                organization_name: .organization_name
            }'
        else
            echo "$body"
        fi
        return 0
    else
        log_warning "Unable to get project settings (HTTP $http_code)"
        return 1
    fi
}

create_environment_variable() {
    local var_name="$1"
    local var_value="$2"

    log_info "Creating environment variable: $var_name"

    local endpoint="$CIRCLECI_API_BASE/project/$VCS_TYPE/$ORG/$REPO/envvar"
    local data=$(jq -n --arg name "$var_name" --arg value "$var_value" '{name: $name, value: $value}')

    local result=$(api_call "POST" "$endpoint" "$data")
    local http_code=$(echo "$result" | cut -d'|' -f1)

    if [ "$http_code" -eq 201 ]; then
        log_success "Environment variable created: $var_name"
        return 0
    elif [ "$http_code" -eq 400 ]; then
        log_warning "Environment variable might already exist: $var_name"
        return 0
    else
        log_error "Failed to create environment variable: $var_name (HTTP $http_code)"
        return 1
    fi
}

setup_webhooks() {
    log_info "Setting up webhooks..."

    # Note: CircleCI webhook setup typically requires project settings UI
    # API v2 doesn't fully support webhook configuration yet (as of 2025)

    log_warning "Webhook configuration must be done manually in CircleCI UI"
    echo ""
    echo "To configure webhooks:"
    echo "1. Visit: https://app.circleci.com/settings/project/$VCS_TYPE/$ORG/$REPO/webhooks"
    echo "2. Click 'Add Webhook'"
    echo "3. Set URL: https://api.codegen.com/webhooks/circleci"
    echo "4. Select events: workflow-completed, job-completed"
    echo ""

    return 0
}

trigger_pipeline() {
    log_info "Triggering initial pipeline..."

    local endpoint="$CIRCLECI_API_BASE/project/$VCS_TYPE/$ORG/$REPO/pipeline"
    local data='{"branch":"main"}'

    local result=$(api_call "POST" "$endpoint" "$data")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if [ "$http_code" -eq 201 ] || [ "$http_code" -eq 200 ]; then
        log_success "Pipeline triggered!"

        if command -v jq &> /dev/null; then
            local pipeline_id=$(echo "$body" | jq -r '.id // "unknown"')
            local pipeline_number=$(echo "$body" | jq -r '.number // "unknown"')
            log_info "Pipeline ID: $pipeline_id"
            log_info "Pipeline Number: $pipeline_number"
            echo ""
            echo "View pipeline: https://app.circleci.com/pipelines/$VCS_TYPE/$ORG/$REPO/$pipeline_number"
        fi
        return 0
    else
        log_warning "Unable to trigger pipeline (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

get_recent_pipelines() {
    log_info "Getting recent pipelines..."

    local endpoint="$CIRCLECI_API_BASE/project/$VCS_TYPE/$ORG/$REPO/pipeline?limit=5"
    local result=$(api_call "GET" "$endpoint")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if [ "$http_code" -eq 200 ]; then
        log_success "Recent pipelines retrieved"

        if command -v jq &> /dev/null; then
            echo "$body" | jq '.items[] | {
                number: .number,
                state: .state,
                created_at: .created_at,
                branch: (.vcs.branch // "N/A")
            }'
        else
            echo "$body"
        fi
        return 0
    else
        log_warning "Unable to get pipelines (HTTP $http_code)"
        return 1
    fi
}

# ================================================================================
# Main Setup Flow
# ================================================================================

main() {
    echo ""
    echo "========================================="
    echo "  CircleCI Automated Setup"
    echo "========================================="
    echo ""

    # Step 1: Check dependencies
    check_dependencies

    # Step 2: Check token
    check_token

    # Step 3: Get repository info
    get_repo_info

    echo ""
    log_info "Repository: $VCS_TYPE/$ORG/$REPO"
    echo ""

    # Step 4: Test API connection
    if ! test_api_connection; then
        log_error "Setup aborted: API connection failed"
        exit 1
    fi

    echo ""

    # Step 5: Check if project exists
    if check_project_exists; then
        log_info "Project already exists in CircleCI"

        # Get settings
        echo ""
        get_project_settings
    else
        # Step 6: Follow/create project
        echo ""
        if ! follow_project; then
            log_error "Setup aborted: Failed to create project"
            exit 1
        fi

        log_success "Project successfully added to CircleCI!"
    fi

    # Step 7: Setup environment variables (optional)
    echo ""
    log_info "Environment variables setup skipped"
    log_info "Add variables manually at: https://app.circleci.com/settings/project/$VCS_TYPE/$ORG/$REPO/environment-variables"

    # Step 8: Setup webhooks (manual)
    echo ""
    setup_webhooks

    # Step 9: Trigger initial pipeline
    echo ""
    if trigger_pipeline; then
        log_success "Initial pipeline triggered successfully!"
    fi

    # Step 10: Show recent pipelines
    echo ""
    get_recent_pipelines

    # Final summary
    echo ""
    echo "========================================="
    echo "  Setup Complete!"
    echo "========================================="
    echo ""
    log_success "CircleCI project is configured and ready"
    echo ""
    echo "Next steps:"
    echo "1. ✅ Project enabled in CircleCI"
    echo "2. ⚠️  Configure webhooks manually (see above)"
    echo "3. 🔄 Monitor pipeline: https://app.circleci.com/pipelines/$VCS_TYPE/$ORG/$REPO"
    echo "4. 🤖 Setup Codegen integration: https://codegen.com/settings/integrations"
    echo ""
}

# ================================================================================
# Script Entry Point
# ================================================================================

# Run main function
main "$@"
