#!/bin/bash

echo "================================"
echo "Codegen Integration System Test"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAIL++))
    fi
}

# Test 1: File Structure
echo "Test 1: File Structure"
echo "-----------------------"

[ -f .github/workflows/codegen.yml ]
test_result $? "codegen.yml exists"

[ -f .github/workflows/codegen-labels.yml ]
test_result $? "codegen-labels.yml exists"

[ -f .codegen/config.yml ]
test_result $? ".codegen/config.yml exists"

[ -f .codegen/README.md ]
test_result $? ".codegen/README.md exists"

[ -f docs/CODEGEN-SETUP.md ]
test_result $? "CODEGEN-SETUP.md exists"

[ -f docs/CODEGEN-QUICKSTART.md ]
test_result $? "CODEGEN-QUICKSTART.md exists"

[ -f docs/CODEGEN-INTEGRATIONS.md ]
test_result $? "CODEGEN-INTEGRATIONS.md exists"

[ -f docs/CODEGEN-GITHUB-APP-SETUP.md ]
test_result $? "CODEGEN-GITHUB-APP-SETUP.md exists"

[ -f docs/GITHUB-SECRETS-SETUP.md ]
test_result $? "GITHUB-SECRETS-SETUP.md exists"

[ -f scripts/setup-codegen.sh ]
test_result $? "setup-codegen.sh exists"

[ -x scripts/setup-codegen.sh ]
test_result $? "setup-codegen.sh is executable"

echo ""

# Test 2: YAML Syntax
echo "Test 2: YAML Syntax Validation"
echo "--------------------------------"

python3 -c "import yaml; yaml.safe_load(open('.github/workflows/codegen.yml'))" 2>/dev/null
test_result $? "codegen.yml syntax"

python3 -c "import yaml; yaml.safe_load(open('.github/workflows/codegen-labels.yml'))" 2>/dev/null
test_result $? "codegen-labels.yml syntax"

python3 -c "import yaml; yaml.safe_load(open('.codegen/config.yml'))" 2>/dev/null
test_result $? "config.yml syntax"

echo ""

# Test 3: Workflow Configuration
echo "Test 3: Workflow Configuration"
echo "-------------------------------"

grep -q "issue_comment" .github/workflows/codegen.yml
test_result $? "Issue comment trigger configured"

grep -q "workflow_dispatch" .github/workflows/codegen.yml
test_result $? "Manual dispatch configured"

grep -q "permissions:" .github/workflows/codegen.yml
test_result $? "Workflow permissions set"

grep -q "contents: write" .github/workflows/codegen.yml
test_result $? "Contents write permission"

grep -q "pull-requests: write" .github/workflows/codegen.yml
test_result $? "PR write permission"

echo ""

# Test 4: Label Workflow
echo "Test 4: Label-Based Workflow"
echo "-----------------------------"

grep -q "pull_request:" .github/workflows/codegen-labels.yml
test_result $? "PR labeled trigger"

grep -q "issues:" .github/workflows/codegen-labels.yml
test_result $? "Issue labeled trigger"

grep -q "codegen:bug-fix" .github/workflows/codegen-labels.yml
test_result $? "Bug-fix label handler"

grep -q "codegen:feature" .github/workflows/codegen-labels.yml
test_result $? "Feature label handler"

echo ""

# Test 5: Configuration
echo "Test 5: Configuration Validation"
echo "----------------------------------"

grep -q "model: \"sonnet-4.5\"" .codegen/config.yml
test_result $? "Model configuration"

grep -q "create_prs: true" .codegen/config.yml
test_result $? "Create PRs permission"

grep -q "merge_prs: false" .codegen/config.yml
test_result $? "Merge PRs disabled (security)"

grep -q "circleci:" .codegen/config.yml
test_result $? "CircleCI integration config"

grep -q "sentry:" .codegen/config.yml
test_result $? "Sentry integration config"

grep -q "linear:" .codegen/config.yml
test_result $? "Linear integration config"

echo ""

# Test 6: Documentation
echo "Test 6: Documentation Completeness"
echo "-----------------------------------"

[ $(wc -l < docs/CODEGEN-SETUP.md) -gt 100 ]
test_result $? "SETUP guide has content (>100 lines)"

[ $(wc -l < docs/CODEGEN-INTEGRATIONS.md) -gt 300 ]
test_result $? "INTEGRATIONS guide has content (>300 lines)"

[ $(wc -l < docs/CODEGEN-GITHUB-APP-SETUP.md) -gt 100 ]
test_result $? "GitHub App guide has content (>100 lines)"

grep -q "CircleCI" docs/CODEGEN-INTEGRATIONS.md
test_result $? "CircleCI documented"

grep -q "Sentry" docs/CODEGEN-INTEGRATIONS.md
test_result $? "Sentry documented"

grep -q "Linear" docs/CODEGEN-INTEGRATIONS.md
test_result $? "Linear documented"

grep -q "Slack" docs/CODEGEN-INTEGRATIONS.md
test_result $? "Slack documented"

echo ""

# Test 7: Security
echo "Test 7: Security Configuration"
echo "--------------------------------"

! grep -r "CODEGEN_API_TOKEN=" .github/workflows/ 2>/dev/null | grep -v "secrets.CODEGEN"
test_result $? "No hardcoded API tokens"

grep -q "merge_prs: false" .codegen/config.yml
test_result $? "Auto-merge disabled"

grep -q "modify_workflows: false" .codegen/config.yml
test_result $? "Workflow modification disabled"

grep -q "delete_branches: false" .codegen/config.yml
test_result $? "Branch deletion disabled"

echo ""

# Test 8: Integration Points
echo "Test 8: Integration Points"
echo "---------------------------"

grep -q "@codegen" .github/workflows/codegen.yml
test_result $? "@codegen mention detection"

grep -q "github.rest.issues.createComment" .github/workflows/codegen.yml
test_result $? "GitHub API comment creation"

grep -q "Codegen GitHub App" .github/workflows/codegen.yml
test_result $? "GitHub App reference"

grep -q "https://codegen.com/runs" .github/workflows/codegen.yml
test_result $? "Agent run tracking link"

echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo "Total: $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
fi
