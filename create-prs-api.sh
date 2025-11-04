#!/bin/bash

# 🚀 Создание PR через GitHub API (curl)
# Используйте этот скрипт если у вас нет gh CLI

set -e

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Создание Pull Requests через GitHub API"
echo "════════════════════════════════════════════════════════════"
echo ""

# Проверка токена
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN не установлен!"
    echo ""
    echo "Установите токен:"
    echo "  export GITHUB_TOKEN='your_github_token_here'"
    echo ""
    echo "Создайте токен на: https://github.com/settings/tokens"
    echo "Требуемые права: repo (Full control of private repositories)"
    exit 1
fi

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Конфигурация
REPO_OWNER="evgenygurin"
REPO_NAME="claude-code-connect"
BASE_BRANCH="main"
API_URL="https://api.github.com"

echo "📦 Репозиторий: ${REPO_OWNER}/${REPO_NAME}"
echo "🌿 Base branch: ${BASE_BRANCH}"
echo ""

# Функция создания PR через API
create_pr_api() {
    local branch=$1
    local title=$2
    local body=$3
    local number=$4

    echo -e "${BLUE}[$number/5]${NC} Создаю PR: ${title}"
    echo "  Ветка: ${branch}"

    # Экранирование JSON
    local body_escaped=$(echo "$body" | jq -Rs .)
    local title_escaped=$(echo "$title" | jq -Rs .)

    # API запрос
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer ${GITHUB_TOKEN}" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "${API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/pulls" \
        -d "{
            \"title\": ${title_escaped},
            \"body\": ${body_escaped},
            \"head\": \"${branch}\",
            \"base\": \"${BASE_BRANCH}\"
        }")

    # Разделить response и http_code
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "201" ]; then
        pr_url=$(echo "$response_body" | jq -r '.html_url')
        echo -e "${GREEN}  ✅ Успешно создан!${NC}"
        echo "  ${pr_url}"
    elif [ "$http_code" = "422" ]; then
        echo -e "${YELLOW}  ⚠️  PR уже существует или ветка не отличается от base${NC}"
        # Попытка найти существующий PR
        existing_pr=$(curl -s \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
            "${API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/pulls?head=${REPO_OWNER}:${branch}&base=${BASE_BRANCH}" \
            | jq -r '.[0].html_url // "Not found"')
        if [ "$existing_pr" != "Not found" ]; then
            echo "  Существующий PR: ${existing_pr}"
        fi
    else
        echo -e "${YELLOW}  ❌ Ошибка (HTTP ${http_code})${NC}"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    fi
    echo ""
}

# Проверка jq
if ! command -v jq &> /dev/null; then
    echo "❌ jq не установлен!"
    echo "Установите: brew install jq (macOS) или apt-get install jq (Linux)"
    exit 1
fi

# 1. SonarQube Integration
create_pr_api \
    "claude/merge-setup-sonarqube-011CUnq3Q56a77QXLSHf88gV" \
    "Add SonarQube code quality integration" \
    "## 📊 SonarQube Integration

### Changes
- Added SonarQube workflow for CI/CD
- Created \`sonar-project.properties\` configuration
- Added \`@vitest/coverage-v8\` dependency
- Documentation: \`docs/SONARQUBE-SETUP.md\`

### Files Changed
- 10 files modified
- 928 additions, 7 deletions

### Testing
- ✅ Auto-merge successful (no conflicts)
- ⚠️ 8 TypeScript errors (in tests)

### Merge Priority
🔢 **1 of 5** - Merge first (independent)

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    1

# 2. Boss Agent Integration
create_pr_api \
    "claude/merge-boss-agent-integration-011CUnq3Q56a77QXLSHf88gV" \
    "Boss Agent with 100% integration tests" \
    "## 🤖 Boss Agent Integration

### Changes
- Complete Boss Agent implementation with 100% tests
- Created \`src/boss-agent/\` directory with full suite
- Created \`src/codegen/\` directory with Codegen integration
- Updated \`src/server/integration.ts\` with Boss Agent endpoints
- Documentation: \`docs/BOSS-AGENT-MANUAL-TESTING.md\`

### Files Changed
- 32 files modified
- 8,369 additions, 6,683 deletions

### Testing
- ✅ 100% integration test coverage

### Merge Priority
🔢 **2 of 5** - Merge second

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    2

# 3. Boss Agent Delegation
create_pr_api \
    "claude/merge-boss-agent-delegation-011CUnq3Q56a77QXLSHf88gV" \
    "Add Boss Agent delegation system" \
    "## 🎯 Boss Agent Delegation System

### Changes
- Delegation system for Boss Agent
- Task orchestration and decomposition
- Agent registry and result aggregation

### Files Changed
- 11 files modified
- 2,692 additions

### Merge Priority
🔢 **3 of 5** - Merge third

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    3

# 4. SonarCloud Quality Fixes
create_pr_api \
    "claude/merge-fix-sonarcloud-011CUnq3Q56a77QXLSHf88gV" \
    "Fix SonarCloud quality gate issues" \
    "## 🛠️ SonarCloud Quality Gate Fixes

### Changes
- Code quality improvements
- Linear OAuth system
- Refactored major modules

### Files Changed
- 36 files modified
- 1,056 additions, 745 deletions

### Merge Priority
🔢 **4 of 5** - Merge fourth

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    4

# 5. Codegen Epic
create_pr_api \
    "claude/merge-codegen-epic-011CUnq3Q56a77QXLSHf88gV" \
    "Migrate to Claude Code SDK architecture (EPIC)" \
    "## 🚀 Claude Code SDK Migration (EPIC)

### Changes
- Migration to Claude Code SDK architecture
- 42 conflicts resolved successfully

### Conflicts Resolved
- 32 auto-resolved (add/add)
- 10 manual resolution

### Testing
- ⚠️ 59 TypeScript errors (mostly in tests)
- ⚠️ 74% test success rate

### Merge Priority
🔢 **5 of 5** - Merge LAST

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    5

echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Скрипт завершён!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Проверьте PR: https://github.com/${REPO_OWNER}/${REPO_NAME}/pulls"
echo ""
