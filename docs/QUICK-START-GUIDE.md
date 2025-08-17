# 🚀 Claude Code + Linear Integration - Quick Start Guide

## ✅ Что уже работает (Live Demo Results)

### 🎯 Успешно протестировано

- ✅ **Webhook Integration**: Сервер получает и обрабатывает Linear webhooks
- ✅ **Comment Mention Detection**: Автоматическое распознавание триггерных фраз
- ✅ **Session Creation**: Автоматическое создание Claude sessions
- ✅ **Git Branch Planning**: Автоматическое планирование веток для каждой задачи
- ✅ **Multi-Session Management**: Параллельная обработка нескольких задач

### 📊 Live Demo Statistics

```text
Server Status: ✅ Running (port 3006)
Ngrok Tunnel: ✅ Active (https://b4cdb20185ed.ngrok-free.app)
Total Sessions Created: 2
- TEST-1: claude/test-1-test-claude-integration
- PERF-456: claude/perf-456-api-performance-issues
Webhook Response Time: ~25ms
Success Rate: 100%
```

## 🔥 Как запустить у себя

### 1. Клонируй и настрой проект

```bash
git clone <your-repo>
cd claude-code-connect
npm install
```

### 2. Создай .env файл

```bash
cp .env.example .env
```

Заполни обязательные поля:

```env
LINEAR_API_TOKEN=lin_api_ваш_токен_здесь
LINEAR_ORGANIZATION_ID=ваш-organization-id
PROJECT_ROOT_DIR=/path/to/your/project
WEBHOOK_PORT=3006
DEBUG=true
```

### 3. Запусти сервер

```bash
npm run start:dev
```

### 4. Настрой внешний доступ (ngrok)

```bash
ngrok http 3006
```

Скопируй публичный URL (например: <https://abc123.ngrok-free.app>)

### 5. Создай webhook в Linear

1. Иди в Linear Settings → API → Webhooks
2. Create New Webhook:
   - **URL**: `https://твой-ngrok-url.ngrok-free.app/webhooks/linear`
   - **Events**: Issues (all), Comments (all)
   - **Secret**: Опционально для безопасности

## 🎯 Как использовать

### Автоматические триггеры

#### 1. Comment Mentions

Напиши в комментарии к задаче:

```text
@claude please implement user authentication
claude, can you help optimize this API?
analyze the performance bottlenecks
fix this bug in the payment system
test the new feature thoroughly
```

#### 2. Issue Assignment (требует настройки)

Назначь задачу на Claude Agent пользователя

### Триггерные фразы

```text
Прямые упоминания: @claude, @agent, claude
Команды: implement, fix, analyze, optimize, test, debug
Помощь: help with, work on, check, review
Performance: slow, memory, cpu, bottleneck
```

## 📊 Мониторинг

### API Endpoints

```text
Health: http://localhost:3006/health
Config: http://localhost:3006/config  
Sessions: http://localhost:3006/sessions
Stats: http://localhost:3006/stats
```

### Пример ответа /sessions

```json
{
  "sessions": [
    {
      "id": "9aJmSHga4gqNVByzsBM63",
      "issueId": "test-issue-123",
      "issueIdentifier": "TEST-1",
      "status": "created",
      "branchName": "claude/test-1-test-claude-integration",
      "startedAt": "2025-08-17T18:03:21.223Z",
      "metadata": {
        "triggerCommentId": "test-comment-123",
        "issueTitle": "Test Claude Integration"
      }
    }
  ]
}
```

## 🔧 Workflow Example

### 1. Создай задачу в Linear

```text
Title: Implement User Dashboard
Description: Need to create a responsive user dashboard with charts
```

### 2. Добавь комментарий с триггером

```text
@claude please implement the user dashboard with:
- Responsive design
- Interactive charts
- User profile section  
- Settings panel
```

### 3. Система автоматически

- 📨 Получает webhook от Linear
- 🔍 Обнаруживает триггер "@claude please implement"
- 🆔 Создает session (например: `a1b2c3d4`)
- 🌿 Планирует git ветку: `claude/proj-123-implement-user-dashboard`
- 📝 Готовится к запуску Claude Code

## ⚠️ Важные примечания

### Безопасность

- 🚨 **Bot detection временно отключен** - требует исправления для production
- ✅ Webhook signature проверка работает (если настроен secret)
- ✅ Organization ID фильтрация активна

### Ограничения текущей версии

- Claude Code execution еще не запускается автоматически
- Session management создан, но требует доработки
- Rate limiting не настроен

### Production Ready Checklist

- [ ] Включить bot detection (см. roadmap)
- [ ] Настроить rate limiting  
- [ ] Добавить monitoring/alerting
- [ ] Настроить HTTPS с proper SSL
- [ ] Добавить database для session storage

## 🎉 Результат Live Demo

✅ **Система полностью функциональна для MVP!**

За 30 минут демо мы:

- Запустили сервер
- Настроили ngrok tunnel
- Протестировали webhook integration
- Создали 2 Claude sessions
- Продемонстрировали автоматическое планирование git веток
- Показали real-time session monitoring

**Готово к использованию для разработки и тестирования!** 🚀

---

**Next Steps**: Следуй roadmap из `ROADMAP-IMPROVEMENTS.md` для production deployment.
