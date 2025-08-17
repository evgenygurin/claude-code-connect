#!/bin/bash

echo "🛑 Останавливаем всё..."

# Убить все процессы
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "cyrus" 2>/dev/null || true
lsof -ti:3005,3006,3456 | xargs kill -9 2>/dev/null || true

# Убить сохранённый PID
if [ -f .server.pid ]; then
    PID=$(cat .server.pid)
    kill $PID 2>/dev/null || true
    rm .server.pid
    echo "✅ Остановлен процесс $PID"
fi

echo "✅ Все процессы остановлены"