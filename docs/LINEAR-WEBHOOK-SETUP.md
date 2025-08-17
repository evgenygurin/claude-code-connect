# 🔗 Настройка Linear Webhook - Пошаговое руководство

## 📋 Быстрая настройка

### 🚀 Готовая информация для настройки

```text
Webhook URL: https://b4cdb20185ed.ngrok-free.app/webhooks/linear
Webhook Secret: Используй секрет из .env файла
Events: Issues (все), Comments (все)
```

### 🔧 Шаги настройки в Linear

1. **Открой Linear Settings**
   - Перейди на <https://linear.app/evgeny_dev/settings/api/webhooks>
   - Или: Settings → API → Webhooks

2. **Создай новый webhook**

   ```text
   Name: Claude Code Integration
   URL: https://b4cdb20185ed.ngrok-free.app/webhooks/linear
   Secret: [Используй секрет из .env файла]
   ```

3. **Выбери события (Events)**
   - ✅ Issues: **created**, **updated**, **deleted**
   - ✅ Comments: **created**, **updated**, **deleted**
   - ✅ Projects: **created**, **updated** (опционально)
   - ✅ Cycles: **created**, **updated** (опционально)

4. **Сохрани webhook**
   - Нажми "Create webhook"
   - Webhook будет активирован автоматически

## 🧪 Тестирование подключения

### 1. Проверь статус сервера

```bash
curl https://b4cdb20185ed.ngrok-free.app/health
```

### 2. Создай тестовую задачу в Linear

- Заголовок: "Test Claude Code Integration"
- Описание: "Testing webhook connection @claude"
- Assignee: Назначь на себя или агента

### 3. Проверь логи сервера

```bash
# Логи должны показать получение webhook'а
tail -f logs/integration.log
```

## 🎯 Триггеры активации Claude

### Автоматические триггеры

1. **Issue Assignment** - Назначение задачи на агента
2. **Comment Mention** - Упоминание ключевых слов в комментариях:
   - @claude, @agent
   - "help with", "implement", "fix this"
   - "analyze", "review", "optimize"
   - "test", "debug", "refactor"

### Примеры рабочих комментариев

```text
"@claude please help implement authentication"
"Claude, can you fix this bug?"
"implement user registration feature"
"analyze performance issues"
"test the new API endpoints"
```

## 🔍 Мониторинг и отладка

### Endpoints для мониторинга

```text
Health: https://b4cdb20185ed.ngrok-free.app/health
Config: https://b4cdb20185ed.ngrok-free.app/config
Sessions: https://b4cdb20185ed.ngrok-free.app/sessions
Stats: https://b4cdb20185ed.ngrok-free.app/stats
```

### Проверка webhook'ов

1. **Linear Webhook Logs**: Settings → API → Webhooks → View Deliveries
2. **Server Logs**: Смотри файл `logs/integration.log`
3. **ngrok Inspector**: <http://localhost:4040>

## ⚠️ Важные настройки

### Безопасность

- ✅ Webhook secret настроен
- ✅ HTTPS соединение
- ✅ Проверка подписи включена

### Performance

- ⚠️ Bot detection временно отключен (требует исправления)
- ✅ Rate limiting планируется
- ✅ Session cleanup работает

## 🚨 Troubleshooting

### Webhook не работает

1. Проверь URL доступен: `curl https://b4cdb20185ed.ngrok-free.app/health`
2. Проверь события в Linear webhook settings
3. Проверь логи: `tail -f logs/integration.log`

### Claude не отвечает

1. Проверь триггерные фразы в комментариях
2. Убедись что bot detection не блокирует
3. Проверь статус сессий: `/sessions` endpoint

### Ошибки в логах

1. **401 Unauthorized**: Проверь Linear API token
2. **Signature verification failed**: Проверь webhook secret
3. **Session creation failed**: Проверь права доступа к Git

---

**Готово!** Теперь Claude Code будет автоматически реагировать на события в Linear! 🎉
