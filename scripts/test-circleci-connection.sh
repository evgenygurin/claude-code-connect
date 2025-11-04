#!/bin/bash

# ================================================================================
# CircleCI API Connection Test
# ================================================================================
# Quick test to verify CircleCI API token and connection
#
# Usage:
#   export CIRCLECI_TOKEN="your_token_here"
#   ./scripts/test-circleci-connection.sh
# ================================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================="
echo "  CircleCI API Connection Test"
echo "========================================="
echo ""

# Check token
if [ -z "${CIRCLECI_TOKEN:-}" ]; then
    echo -e "${RED}❌ CIRCLECI_TOKEN not set${NC}"
    echo ""
    echo "Set your token:"
    echo "  export CIRCLECI_TOKEN='your_token_here'"
    echo ""
    echo "Get token from:"
    echo "  https://app.circleci.com/settings/user/tokens"
    exit 1
fi

echo -e "${GREEN}✅ Token found${NC}"
echo ""

# Test API connection
echo -e "${BLUE}ℹ️  Testing API connection...${NC}"

response=$(curl -s -w "\n%{http_code}" \
    -H "Circle-Token: $CIRCLECI_TOKEN" \
    -H "Accept: application/json" \
    https://circleci.com/api/v2/me)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
    echo ""

    if command -v jq &> /dev/null; then
        echo "User details:"
        echo "$body" | jq '{
            id: .id,
            name: .name,
            login: .login
        }'
    else
        echo "Raw response (install jq for formatted output):"
        echo "$body"
    fi

    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  API Token is Valid and Working!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "You can now run:"
    echo "  ./scripts/setup-circleci.sh"
    echo ""
else
    echo -e "${RED}❌ Connection failed (HTTP $http_code)${NC}"
    echo ""
    echo "Response:"
    echo "$body"
    echo ""
    echo "Possible issues:"
    echo "1. Invalid or expired token"
    echo "2. Network connectivity problem"
    echo "3. CircleCI API is down"
    echo ""
    echo "Try:"
    echo "1. Generate new token: https://app.circleci.com/settings/user/tokens"
    echo "2. Check CircleCI status: https://status.circleci.com"
    exit 1
fi
