#!/bin/bash

# 🚀 Автоматическое создание всех PR
# Этот скрипт создаст 5 PR в правильном порядке

set -e

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Создание Pull Requests для всех merge веток"
echo "════════════════════════════════════════════════════════════"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка наличия GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) не установлен!"
    echo ""
    echo "Установите gh CLI:"
    echo "  macOS: brew install gh"
    echo "  Linux: https://github.com/cli/cli#installation"
    echo "  Windows: https://github.com/cli/cli#installation"
    echo ""
    echo "После установки запустите: gh auth login"
    exit 1
fi

# Проверка авторизации
if ! gh auth status &> /dev/null; then
    echo "❌ Не авторизованы в GitHub!"
    echo "Запустите: gh auth login"
    exit 1
fi

# База репозитория
REPO="evgenygurin/claude-code-connect"
BASE_BRANCH="main"

echo "📦 Репозиторий: ${REPO}"
echo "🌿 Base branch: ${BASE_BRANCH}"
echo ""

# Функция создания PR
create_pr() {
    local branch=$1
    local title=$2
    local body=$3
    local number=$4

    echo -e "${BLUE}[$number/5]${NC} Создаю PR: ${title}"
    echo "  Ветка: ${branch}"

    # Создание PR
    PR_URL=$(gh pr create \
        --repo "${REPO}" \
        --base "${BASE_BRANCH}" \
        --head "${branch}" \
        --title "${title}" \
        --body "${body}" \
        2>&1)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ Успешно создан!${NC}"
        echo "  ${PR_URL}"
    else
        echo -e "${YELLOW}  ⚠️  Возможно PR уже существует${NC}"
    fi
    echo ""
}

# 1. SonarQube Integration
create_pr \
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
create_pr \
    "claude/merge-boss-agent-integration-011CUnq3Q56a77QXLSHf88gV" \
    "Boss Agent with 100% integration tests" \
    "## 🤖 Boss Agent Integration

### Changes
- Complete Boss Agent implementation with 100% tests
- Created \`src/boss-agent/\` directory:
  - \`agent.ts\` - main agent
  - \`decision-engine.ts\` - decision making
  - \`task-classifier.ts\` - task classification
  - \`task-session-manager.ts\` - session management
  - Full unit & integration tests
- Created \`src/codegen/\` directory:
  - \`client.ts\` - Codegen HTTP client
  - \`prompt-builder.ts\` - prompt construction
  - \`webhook-handler.ts\` - webhook processing
- Updated \`src/server/integration.ts\` with Boss Agent endpoints
- Documentation: \`docs/BOSS-AGENT-MANUAL-TESTING.md\`, \`docs/TESTING-SUMMARY.md\`

### Files Changed
- 32 files modified
- 8,369 additions, 6,683 deletions

### Testing
- ✅ Auto-merge successful (no conflicts)
- ✅ 100% integration test coverage
- ⚠️ 19 TypeScript errors

### Merge Priority
🔢 **2 of 5** - Merge second (foundation for delegation)

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    2

# 3. Boss Agent Delegation
create_pr \
    "claude/merge-boss-agent-delegation-011CUnq3Q56a77QXLSHf88gV" \
    "Add Boss Agent delegation system" \
    "## 🎯 Boss Agent Delegation System

### Changes
- Delegation system for Boss Agent
- Created components:
  - \`agent-registry.ts\` - agent registry
  - \`delegation-manager.ts\` - delegation management
  - \`orchestrator.ts\` - task orchestration
  - \`result-aggregator.ts\` - result aggregation
  - \`task-analyzer.ts\` - task analysis
  - \`task-decomposer.ts\` - task decomposition
- Extended \`src/core/types.ts\` (+163 lines)
- Updated \`src/sessions/manager.ts\` (+110 lines)

### Files Changed
- 11 files modified
- 2,692 additions

### Testing
- ✅ Auto-merge successful (no conflicts)
- ✅ Complements boss-agent-integration perfectly

### Merge Priority
🔢 **3 of 5** - Merge third (after boss-agent-integration)

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    3

# 4. SonarCloud Quality Fixes
create_pr \
    "claude/merge-fix-sonarcloud-011CUnq3Q56a77QXLSHf88gV" \
    "Fix SonarCloud quality gate issues" \
    "## 🛠️ SonarCloud Quality Gate Fixes

### Changes
- Code quality improvements for SonarCloud
- Created \`.eslintrc.json\` with rules
- Refactored major modules:
  - \`src/boss/*\` - type improvements
  - \`src/claude/executor.ts\` - refactoring
  - \`src/github/*\` - improvements
  - \`src/linear/oauth/*\` - NEW OAuth system
  - \`src/security/*\` - security improvements
  - \`src/server/integration.ts\` - refactoring
  - \`src/testing/*\` - test improvements
  - \`src/utils/*\` - utility improvements
  - \`src/webhooks/*\` - handler refactoring

### Files Changed
- 36 files modified
- 1,056 additions, 745 deletions

### Testing
- ✅ Auto-merge successful (no conflicts)
- ✅ Linear OAuth system added

### Merge Priority
🔢 **4 of 5** - Merge fourth (quality improvements)

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    4

# 5. Codegen Epic
create_pr \
    "claude/merge-codegen-epic-011CUnq3Q56a77QXLSHf88gV" \
    "Migrate to Claude Code SDK architecture (EPIC)" \
    "## 🚀 Claude Code SDK Migration (EPIC)

### Changes
- Migration to Claude Code SDK architecture
- New workflows: \`.github/workflows/claude-code-review.yml\`
- New scripts:
  - \`scripts/check-linear-issues.ts\`
  - \`scripts/create-linear-issues.ts\`
  - \`scripts/create-team-tasks.ts\`
  - \`scripts/find-duplicates.ts\`
  - \`scripts/test-filter.ts\`
- Updated all testing files
- Updated all security files
- Added \`better-sqlite3\` dependency

### Conflicts Resolved
- **Total conflicts:** 42 files
- **Auto-resolved:** 32 files (add/add conflicts - accepted theirs)
- **Manual resolution:** 10 files (content conflicts)
  - \`package.json\` - merged dependencies
  - \`package-lock.json\` - regenerated
  - Documentation files - kept ours (more complete)
  - Code files - kept ours (more recent)

### Files Changed
- 38+ files modified
- Major architectural changes

### Testing
- ✅ All conflicts resolved
- ⚠️ 59 TypeScript errors (mostly in tests)
- ⚠️ Test success rate: 74% (169/227 passing)

### Merge Priority
🔢 **5 of 5** - Merge LAST (final integration)

⚠️ **IMPORTANT:** Merge only after all previous PRs are merged to main!

See \`MERGE-SUMMARY-REPORT.md\` for full details." \
    5

echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Все PR созданы!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Следующие шаги:"
echo "  1. Проверьте PR на GitHub: https://github.com/${REPO}/pulls"
echo "  2. Проведите code review"
echo "  3. Мержите в рекомендуемом порядке (1 → 2 → 3 → 4 → 5)"
echo "  4. После каждого merge запускайте: npm install && npm test"
echo ""
echo "📚 Документация:"
echo "  • MERGE-SUMMARY-REPORT.md - полный отчёт"
echo "  • MERGE-CONFLICTS-RESOLUTION.md - разрешение конфликтов"
echo "  • PR-LINKS.md - ссылки на PR"
echo ""
