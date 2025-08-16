# GitHub Branch Protection Setup

## Требуется настройка в GitHub UI:

### 1. prod ветка (КРИТИЧНО! РУЧНОЕ ПОДТВЕРЖДЕНИЕ):
- Settings → Branches → Add rule
- Branch name pattern: `prod`
- ✅ Require a pull request before merging
- ✅ Require approvals: **2**
- ✅ Dismiss stale PR reviews when new commits are pushed
- ✅ Require review from code owners
- ✅ Require approval of the most recent reviewable push
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Restrict pushes that create files
- ❌ Allow force pushes
- ❌ Allow deletions

### 2. stage ветка:
- Settings → Branches → Add rule  
- Branch name pattern: `stage`
- ✅ Require a pull request before merging
- ✅ Require approvals: **1**
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

### 3. dev ветка:
- Settings → Branches → Add rule
- Branch name pattern: `dev`  
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging

## Git Flow:
```
Feature → dev → stage → prod
         ↓      ↓       ↓
        CI     CI+1👤  CI+2👤
```

## Команды для работы:
```bash
# Разработка
git checkout dev
git pull origin dev
git checkout -b feature/EVG-174-claude-executor
# ... работа ...
git push origin feature/EVG-174-claude-executor
# → Создать PR в dev

# Деплой в stage  
git checkout stage
git pull origin stage
# → Создать PR из dev в stage

# Деплой в prod (РУЧНОЕ ПОДТВЕРЖДЕНИЕ!)
git checkout prod  
git pull origin prod
# → Создать PR из stage в prod (требует 2 аппрува!)
```