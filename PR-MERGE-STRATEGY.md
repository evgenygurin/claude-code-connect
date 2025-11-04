# 🔀 Стратегия слияния PR

## 📊 Статус веток (2025-11-04)

### ✅ Уже слиты в `main`:

- `claude/review-pull-requests-011CUnq3Q56a77QXLSHf88gV` (текущая ветка)
- `claude/boss-agent-delegation-011CUn2mM4DbQrHQDty3B8zf` (старая)
- `feat/add-phase2-roadmap-planning`

### 🔄 Требуют слияния:

1. **boss-agent-delegation-011CUnYW9WktRw1qhBsy7duJ** (2 коммита)
   - Boss Agent delegation system
   - Изменяет: `src/boss-agent/*` (новая директория)

2. **boss-agent-integration-plan-011CUndTSDbhPYFZqB5qQKqm** (18+ коммитов)
   - Boss Agent integration с 100% тестами
   - Изменяет: `src/boss-agent/*` (та же директория!)

3. **fix-sonarcloud-quality-gate-011CUnnTqB2PA7MyTQAakRMS** (2 коммита)
   - SonarCloud качество кода
   - Изменяет: `src/boss/*`, `src/security/*`, `src/linear/oauth/*`

4. **setup-sonarqube-workflow-011CUnkQr2YYqWu4E3SDrTZt** (4 коммита)
   - SonarQube integration
   - Изменяет: `.github/workflows/sonarqube.yml`, `sonar-project.properties`

5. **codegen/evg-203-epic-migrate-to-production-claude-code-sdk-architecture** (5+ коммитов)
   - Claude Code SDK migration (EPIC!)
   - Изменяет: `.circleci/*`, `.codegen/*`, workflows

## ⚠️ Анализ конфликтов

### 🔴 КРИТИЧЕСКИЕ конфликты:

#### 1. Boss Agent директория конфликт
**Ветки:**
- `boss-agent-delegation-011CUnYW9WktRw1qhBsy7duJ`
- `boss-agent-integration-plan-011CUndTSDbhPYFZqB5qQKqm`

**Конфликт:**
Обе ветки создают и изменяют `src/boss-agent/*`:
- delegation: создаёт delegation-manager, task-analyzer, orchestrator
- integration-plan: создаёт agent, agent.test.ts

**Решение:**
Эти ветки могут быть частью одной работы! Нужно проверить, какая из них более полная.

### 🟡 ВЫСОКИЕ конфликты:

#### 2. CLAUDE.md
**Затрагивает:** ВСЕ 5 веток

**Конфликт:**
Каждая ветка обновляет `CLAUDE.md` с своими инструкциями.

**Решение:**
Объединить все изменения вручную, сохранив уникальные секции из каждой ветки.

#### 3. package.json / package-lock.json
**Затрагивает:** 4 ветки (кроме setup-sonarqube)

**Конфликт:**
Добавление различных зависимостей.

**Решение:**
Установить все зависимости после слияния: `npm install`

### 🟢 СРЕДНИЕ конфликты:

#### 4. CircleCI документация
**Затрагивает:** 4 ветки

**Файлы:**
- `docs/CIRCLECI-INDEX.md`
- `docs/CIRCLECI-INTEGRATION-STUDY.md`
- `docs/CIRCLECI-QUICK-REFERENCE.md`

**Решение:**
Вероятно минимальные конфликты в документации, легко разрешимы.

## 🎯 Рекомендуемая стратегия слияния

### Вариант A: Последовательное слияние (БЕЗОПАСНЫЙ)

```text
main
 ├─> setup-sonarqube-workflow (независимый, малый)
 │   └─> main (слит)
 ├─> boss-agent-integration-plan (большой, основной Boss Agent)
 │   └─> main (слит, возможны конфликты)
 ├─> boss-agent-delegation (зависит от integration-plan)
 │   └─> main (слит, разрешить конфликты)
 ├─> fix-sonarcloud-quality-gate (независимый)
 │   └─> main (слит)
 └─> codegen-epic (EPIC, последний)
     └─> main (слит, итоговая интеграция)
```

**Порядок:**

1. **setup-sonarqube-workflow** (4 коммита, независимый)
   - Малый PR, минимум конфликтов
   - Добавляет SonarQube CI/CD

2. **boss-agent-integration-plan** (18 коммитов, основной Boss Agent)
   - Самый большой PR с Boss Agent
   - Включает 100% тестов
   - База для delegation ветки

3. **boss-agent-delegation** (2 коммита, дополнение к Boss Agent)
   - Слить после integration-plan
   - Добавляет delegation систему
   - Разрешить конфликты в `src/boss-agent/*`

4. **fix-sonarcloud-quality-gate** (2 коммита, качество кода)
   - Фиксит TypeScript и ESLint
   - Улучшает качество кода

5. **codegen-epic** (5 коммитов, Claude Code SDK migration)
   - EPIC PR, финальная интеграция
   - Миграция на SDK архитектуру
   - Проверить все workflows

### Вариант B: Параллельное слияние (БЫСТРЫЙ, РИСКОВАННЫЙ)

Слить независимые ветки параллельно:

```text
Group 1 (независимые):
- setup-sonarqube-workflow
- fix-sonarcloud-quality-gate

Group 2 (Boss Agent - последовательно):
- boss-agent-integration-plan
- boss-agent-delegation

Group 3 (финальная интеграция):
- codegen-epic
```

**⚠️ Внимание:** Может привести к большим конфликтам!

### Вариант C: Squash и новый PR (ЧИСТЫЙ)

Создать новый consolidated PR со всеми изменениями:

```bash
git checkout -b feature/consolidated-integration
git merge --squash origin/claude/setup-sonarqube-workflow-011CUnkQr2YYqWu4E3SDrTZt
git merge --squash origin/claude/boss-agent-integration-plan-011CUndTSDbhPYFZqB5qQKqm
# ... разрешить конфликты
git commit -m "feat: Consolidated integration - Boss Agent, SonarQube, Codegen"
```

## 🚀 Действия для каждой ветки

### 1. setup-sonarqube-workflow

```bash
git checkout origin/main
git checkout -b merge/setup-sonarqube
git merge origin/claude/setup-sonarqube-workflow-011CUnkQr2YYqWu4E3SDrTZt

# Ожидаемые конфликты: CLAUDE.md, README.md
# Разрешить и закоммитить

git push -u origin merge/setup-sonarqube
# Создать PR в main
```

### 2. boss-agent-integration-plan

```bash
git checkout origin/main
git checkout -b merge/boss-agent-integration
git merge origin/claude/boss-agent-integration-plan-011CUndTSDbhPYFZqB5qQKqm

# Ожидаемые конфликты: CLAUDE.md, package.json, docs/*
# Разрешить и закоммитить

git push -u origin merge/boss-agent-integration
# Создать PR в main
```

### 3. boss-agent-delegation

```bash
# Слить ПОСЛЕ boss-agent-integration-plan
git checkout origin/main
git checkout -b merge/boss-agent-delegation
git merge origin/claude/boss-agent-delegation-011CUnYW9WktRw1qhBsy7duJ

# Ожидаемые конфликты: src/boss-agent/*, CLAUDE.md
# Разрешить и закоммитить

git push -u origin merge/boss-agent-delegation
# Создать PR в main
```

### 4. fix-sonarcloud-quality-gate

```bash
git checkout origin/main
git checkout -b merge/fix-sonarcloud
git merge origin/claude/fix-sonarcloud-quality-gate-011CUnnTqB2PA7MyTQAakRMS

# Ожидаемые конфликты: CLAUDE.md, eslintrc, tsconfig
# Разрешить и закоммитить

git push -u origin merge/fix-sonarcloud
# Создать PR в main
```

### 5. codegen-epic

```bash
# Слить ПОСЛЕДНИМ после всех предыдущих
git checkout origin/main
git checkout -b merge/codegen-epic
git merge origin/codegen/evg-203-epic-migrate-to-production-claude-code-sdk-architecture

# Ожидаемые конфликты: CLAUDE.md, workflows, .codegen/*, .circleci/*
# Разрешить и закоммитить

git push -u origin merge/codegen-epic
# Создать PR в main
```

## 📋 Чеклист для каждого слияния

- [ ] Переключиться на актуальный main: `git checkout origin/main`
- [ ] Создать merge ветку
- [ ] Выполнить merge с целевой веткой
- [ ] Разрешить конфликты
- [ ] Запустить тесты: `npm test`
- [ ] Запустить type check: `npm run typecheck`
- [ ] Запустить linter: `npm run lint`
- [ ] Проверить build: `npm run build`
- [ ] Закоммитить merge
- [ ] Запушить ветку
- [ ] Создать PR в GitHub
- [ ] Code review
- [ ] Слить PR в main

## 🔧 Команды для разрешения конфликтов

```bash
# Просмотр конфликтов
git status

# Просмотр конфликтующих файлов
git diff --name-only --diff-filter=U

# Принять "их" версию (incoming)
git checkout --theirs <file>

# Принять "нашу" версию (current)
git checkout --ours <file>

# Ручное разрешение
vim <file>  # Редактировать вручную
git add <file>

# Продолжить merge после разрешения
git merge --continue
```

## 🎯 Финальная рекомендация

**Я рекомендую Вариант A (Последовательное слияние):**

1. Начать с **setup-sonarqube-workflow** - быстрая победа
2. Слить **boss-agent-integration-plan** - основная работа
3. Слить **boss-agent-delegation** - дополнение
4. Слить **fix-sonarcloud-quality-gate** - quality improvements
5. Финализировать с **codegen-epic** - архитектурная миграция

Этот подход:
- ✅ Минимизирует конфликты
- ✅ Позволяет тестировать после каждого слияния
- ✅ Обеспечивает чистую историю
- ✅ Легко откатить при проблемах
- ✅ Понятная последовательность изменений

## ⚠️ Важные замечания

1. **Boss Agent конфликт**: Обязательно проверить, не дублируются ли функции между `boss-agent-delegation` и `boss-agent-integration-plan`
2. **CLAUDE.md**: Это самый проблемный файл - потребует ручного merge всех секций
3. **package.json**: После всех слияний выполнить `npm install` для синхронизации зависимостей
4. **Тесты**: После каждого слияния запускать `npm test` для проверки работоспособности
5. **CI/CD**: Убедиться, что все workflows работают после слияния

## 🔗 Связанные ресурсы

- Git merge documentation: https://git-scm.com/docs/git-merge
- Resolving merge conflicts: https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging
- GitHub PR best practices: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests
