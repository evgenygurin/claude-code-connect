# 🚀 Git Flow Strategy

## Структура веток:

```
main (защищена)
 │
 ├── dev (разработка)
 │    └── feature/EVG-xxx-feature-name
 │
 ├── stage (тестирование)
 │
 └── prod (продакшн) ⚠️ РУЧНОЕ ПОДТВЕРЖДЕНИЕ
```

## 📋 Правила Git Flow:

### 1. Разработка (dev):
```bash
# Создание feature ветки
git checkout dev
git pull origin dev
git checkout -b feature/EVG-174-claude-executor

# Разработка...
git add .
git commit -m "feat(core): implement ClaudeExecutor base class"
git push origin feature/EVG-174-claude-executor

# Создать PR: feature/EVG-174-claude-executor → dev
```

### 2. Staging (stage):
```bash
# После мержа в dev, деплой в stage
git checkout stage
git pull origin stage

# Создать PR: dev → stage (требует CI прохождения)
```

### 3. Production (prod): ⚠️ КРИТИЧНО!
```bash
# ТОЛЬКО после тестирования в stage
git checkout prod
git pull origin prod

# Создать PR: stage → prod
# ❗ ТРЕБУЕТ:
# - 2 ручных аппрува
# - Прохождение всех CI тестов
# - Manual approval в GitHub UI
```

## 🔒 Защита веток:

### prod ветка (МАКСИМАЛЬНАЯ ЗАЩИТА):
- ✅ 2 обязательных аппрува
- ✅ CI должен пройти
- ✅ Ручное подтверждение в GitHub UI
- ❌ Force push запрещён
- ❌ Прямой push запрещён

### stage ветка:
- ✅ 1 аппрув
- ✅ CI должен пройти
- ✅ Только из dev ветки

### dev ветка:
- ✅ CI должен пройти
- ✅ От feature веток

## 📊 Environments:

| Environment | Branch | URL | Deploy |
|-------------|--------|-----|--------|
| Development | `dev` | http://dev.claude-code-connect.com | Auto |
| Staging | `stage` | http://stage.claude-code-connect.com | Manual |
| Production | `prod` | https://claude-code-connect.com | **Manual + 2 Approvals** |

## 🚨 ВАЖНЫЕ ПРАВИЛА:

1. **НИКОГДА не пушить напрямую в prod!**
2. **Всегда тестировать в stage перед prod**
3. **PR в prod требует 2 аппрува**
4. **Feature ветки создавать от dev**
5. **Hotfix только через экстренную процедуру**

## 💡 Команды для быстрого старта:

```bash
# Начать новую фичу
./scripts/start-feature.sh EVG-174

# Деплой в staging
./scripts/deploy-stage.sh

# Подготовка к продакшну (создаёт PR)
./scripts/prepare-prod.sh
```

## 🔄 Workflow Example:

1. **Feature Development**: `feature/EVG-174-claude-executor` → `dev`
2. **Integration Testing**: `dev` → `stage` 
3. **Production Release**: `stage` → `prod` (с ручным подтверждением!)

**⚠️ prod ветка защищена максимально - требует 2 аппрува + ручное подтверждение!**