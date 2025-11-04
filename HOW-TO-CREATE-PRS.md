# 🚀 Как создать все Pull Requests

Все merge ветки готовы и запушены. Теперь нужно создать PR для каждой ветки.

## Способ 1: Автоматически через gh CLI (рекомендуется)

### Предварительные требования

1. Установите GitHub CLI:
   ```bash
   # macOS
   brew install gh

   # Linux
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
   sudo apt update
   sudo apt install gh

   # Windows
   # Скачайте с https://github.com/cli/cli/releases
   ```

2. Авторизуйтесь:
   ```bash
   gh auth login
   ```

### Запуск

```bash
./create-all-prs.sh
```

Скрипт автоматически создаст все 5 PR с полными описаниями!

---

## Способ 2: Через curl + GitHub API

### Предварительные требования

1. Создайте GitHub Personal Access Token:
   - Перейдите: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Выберите права: `repo` (Full control of private repositories)
   - Сохраните токен

2. Установите jq (если нет):
   ```bash
   # macOS
   brew install jq

   # Linux
   sudo apt-get install jq

   # Windows
   # Скачайте с https://stedolan.github.io/jq/download/
   ```

### Запуск

```bash
export GITHUB_TOKEN='your_github_token_here'
./create-prs-api.sh
```

---

## Способ 3: Вручную через GitHub UI

Если скрипты не работают, создайте PR вручную:

### 1. SonarQube Integration
- **Ссылка:** https://github.com/evgenygurin/claude-code-connect/pull/new/claude/merge-setup-sonarqube-011CUnq3Q56a77QXLSHf88gV
- **Title:** Add SonarQube code quality integration
- **Description:** Скопируйте из `MERGE-SUMMARY-REPORT.md` → раздел 1

### 2. Boss Agent Integration
- **Ссылка:** https://github.com/evgenygurin/claude-code-connect/pull/new/claude/merge-boss-agent-integration-011CUnq3Q56a77QXLSHf88gV
- **Title:** Boss Agent with 100% integration tests
- **Description:** Скопируйте из `MERGE-SUMMARY-REPORT.md` → раздел 2

### 3. Boss Agent Delegation
- **Ссылка:** https://github.com/evgenygurin/claude-code-connect/pull/new/claude/merge-boss-agent-delegation-011CUnq3Q56a77QXLSHf88gV
- **Title:** Add Boss Agent delegation system
- **Description:** Скопируйте из `MERGE-SUMMARY-REPORT.md` → раздел 3

### 4. SonarCloud Quality Fixes
- **Ссылка:** https://github.com/evgenygurin/claude-code-connect/pull/new/claude/merge-fix-sonarcloud-011CUnq3Q56a77QXLSHf88gV
- **Title:** Fix SonarCloud quality gate issues
- **Description:** Скопируйте из `MERGE-SUMMARY-REPORT.md` → раздел 4

### 5. Codegen Epic
- **Ссылка:** https://github.com/evgenygurin/claude-code-connect/pull/new/claude/merge-codegen-epic-011CUnq3Q56a77QXLSHf88gV
- **Title:** Migrate to Claude Code SDK architecture (EPIC)
- **Description:** Скопируйте из `MERGE-SUMMARY-REPORT.md` → раздел 5

---

## После создания PR

1. **Проверьте PR** на GitHub: https://github.com/evgenygurin/claude-code-connect/pulls

2. **Code Review**:
   - Проверьте изменения
   - Запустите CI/CD pipelines
   - Проверьте тесты

3. **Merge в правильном порядке**:
   ```
   1. setup-sonarqube          (независимый)
   2. boss-agent-integration    (основной Boss Agent)
   3. boss-agent-delegation     (дополнение к Boss Agent)
   4. fix-sonarcloud            (quality improvements)
   5. codegen-epic              (финальная интеграция - ПОСЛЕДНИЙ!)
   ```

4. **После каждого merge**:
   ```bash
   git checkout main
   git pull origin main
   npm install
   npm run typecheck
   npm test
   npm run build
   ```

---

## Troubleshooting

### "gh: command not found"
Установите GitHub CLI (см. Способ 1)

### "gh auth status" shows "not logged in"
Запустите: `gh auth login`

### "422 Unprocessable Entity"
PR уже существует или ветка не отличается от base. Проверьте существующие PR.

### "API rate limit exceeded"
Подождите час или используйте токен с большим лимитом.

### Скрипт не запускается
Убедитесь, что файл исполняемый:
```bash
chmod +x create-all-prs.sh
chmod +x create-prs-api.sh
```

---

## Документация

- **MERGE-SUMMARY-REPORT.md** - Полный отчёт по слиянию
- **MERGE-CONFLICTS-RESOLUTION.md** - Как были разрешены конфликты
- **PR-LINKS.md** - Быстрые ссылки на PR
- **PR-MERGE-STRATEGY.md** - Стратегия слияния

---

## Быстрый старт

**Если у вас установлен gh CLI:**
```bash
gh auth login
./create-all-prs.sh
```

**Если нет gh CLI, но есть токен:**
```bash
export GITHUB_TOKEN='your_token'
./create-prs-api.sh
```

**Если ничего не работает:**
Откройте https://github.com/evgenygurin/claude-code-connect/pulls и создайте PR вручную по ссылкам выше.

---

✨ **Всё готово к созданию PR!** Удачи! 🚀
