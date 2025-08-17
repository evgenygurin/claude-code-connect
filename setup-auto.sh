#!/bin/bash

echo "🚀 Автоматическая настройка Claude Code + Linear Integration"
echo "=================================================="

# Убить все процессы на портах
echo "🔄 Освобождаем порты..."
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "cyrus" 2>/dev/null || true
lsof -ti:3006,3456 | xargs kill -9 2>/dev/null || true

sleep 2

# Проверить что сервер не запущен
echo "✅ Порты освобождены"

# Создать .env если его нет
if [ ! -f .env ]; then
echo "📝 Создаём .env файл..."
cat > .env << 'EOF'
# Linear API Configuration  
LINEAR_API_TOKEN=lin_api_YOUR_TOKEN_HERE
LINEAR_WEBHOOK_SECRET=your_webhook_secret_here
LINEAR_ORGANIZATION_ID=87cba77e-b503-411e-b068-034d3436ff6c

# Project Configuration
PROJECT_ROOT_DIR=/Users/laptop/dev/claude-code-connect
DEFAULT_BRANCH=main
CREATE_BRANCHES=true

# Server Configuration  
WEBHOOK_PORT=3006
SESSION_TIMEOUT_MINUTES=30

# Claude Configuration
CLAUDE_EXECUTABLE=claude

# Debug
DEBUG=true
EOF
echo "⚠️  ВАЖНО: Добавь свой LINEAR_API_TOKEN в .env файл!"
fi

# Установить зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Проверить TypeScript
echo "🔍 Проверяем TypeScript..."
npm run typecheck

# Создать директории
echo "📁 Создаём необходимые директории..."
mkdir -p .claude-sessions
mkdir -p logs

# Запустить сервер в фоне
echo "🚀 Запускаем сервер..."
npm run start:dev &
SERVER_PID=$!

# Ждём запуска сервера
echo "⏳ Ждём запуска сервера (10 сек)..."
sleep 10

# Проверить что сервер работает
if curl -s http://localhost:3006/health > /dev/null; then
    echo "✅ Сервер запущен успешно!"
    echo "📡 Webhook: http://localhost:3006/webhooks/linear"
    echo "📊 Management: http://localhost:3006/"
else
    echo "❌ Сервер не запустился"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Создать GitHub репозиторий через gh CLI
echo "🐙 Создаём GitHub репозиторий..."
if command -v gh &> /dev/null; then
    gh repo create claude-code-connect --public --source=. --remote=origin --push || true
    echo "✅ Репозиторий создан в GitHub!"
else
    echo "⚠️  gh CLI не установлен. Установи: brew install gh"
fi

# Показать статус
echo ""
echo "🎉 ГОТОВО!"
echo "=================================================="
echo "✅ Сервер запущен на http://localhost:3006"
echo "✅ Webhook endpoint: http://localhost:3006/webhooks/linear"  
echo "✅ Management API: http://localhost:3006/"
echo ""
echo "📋 Что дальше:"
echo "1. Добавь свой LINEAR_API_TOKEN в .env файл"
echo "2. Настрой webhook в Linear на http://localhost:3006/webhooks/linear"
echo "3. Создай issue в Linear и назначь на себя"
echo ""
echo "🛑 Чтобы остановить сервер: kill $SERVER_PID"
echo "📜 Логи сервера: tail -f logs/server.log"

# Сохранить PID для остановки
echo $SERVER_PID > .server.pid
echo "Server PID: $SERVER_PID сохранён в .server.pid"