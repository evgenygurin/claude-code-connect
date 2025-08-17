# Claude Code Connect - Makefile
.PHONY: help install dev build start test lint format typecheck clean init test-connection logs quick-start check-setup show-config

# Default target
.DEFAULT_GOAL := help

## Help - Show available commands
help:
	@echo "🚀 Claude Code Connect - Доступные команды:"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🎯 БЫСТРЫЙ СТАРТ:"
	@echo "  quick-start     Полная автоматическая настройка и запуск"
	@echo "  check-setup     Проверить готовность системы"
	@echo "  show-config     Показать текущую конфигурацию"
	@echo ""
	@echo "🔧 РАЗРАБОТКА:"
	@echo "  dev             Запуск dev сервера с auto-reload"
	@echo "  build           Компиляция TypeScript"
	@echo "  start           Запуск production сервера"
	@echo ""
	@echo "🧪 ТЕСТИРОВАНИЕ:"
	@echo "  test-connection Проверка Linear API подключения"
	@echo "  test            Запуск тестов"
	@echo "  quality         Все проверки качества (lint + types + format)"
	@echo ""
	@echo "🛠️  УТИЛИТЫ:"
	@echo "  logs            Показать логи сервера"
	@echo "  clean           Очистить build артефакты"
	@echo "  status          Git статус"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "💡 Для первого запуска: make quick-start"

## Install - Install dependencies
install:
	@npm install

## Dev - Start development server
dev:
	@npm run dev

## Build - Build TypeScript
build:
	@npm run build && echo "✅ Built"

## Start - Start production server
start: build
	@npm start

## Test - Run test suite
test:
	@npm test && echo "✅ Tests OK"

## Typecheck - Run TypeScript checking
typecheck:
	@npm run typecheck && echo "✅ Types OK"

## Lint - Run ESLint
lint:
	@npm run lint && echo "✅ Lint OK"

## Format - Format code
format:
	@npm run format && echo "✅ Format OK"

## Quality - Run all checks
quality: 
	@npm run typecheck && npm run lint && npm run format && echo "✅ Quality OK"

## Init - Initialize configuration
init:
	@npm run init && echo "✅ Init OK"

## Test Connection - Test Linear API
test-connection:
	@npm run test:connection && echo "✅ Connection OK"

## Clean - Clean build artifacts
clean:
	@rm -rf dist/ node_modules/.cache/ && echo "✅ Clean OK"

## Logs - Show server logs
logs:
	@tail -f server.log 2>/dev/null || echo "No logs"

## Status - Show git status
status:
	@git status --short && echo "Branch: $(shell git branch --show-current)"

## Docker Build - Build image
docker-build:
	@docker build -t claude-code-connect . && echo "✅ Image built"

## Docker Run - Run container
docker-run:
	@docker run -p 3000:3000 --env-file .env claude-code-connect

# Shortcuts
.PHONY: dev-setup quick

## Dev Setup - Install and init
dev-setup: install init

## Quick - All checks
quick: quality test

## Quick Start - Быстрая настройка и запуск
quick-start:
	@echo "🚀 Запуск быстрой настройки Claude Code Connect..."
	@chmod +x scripts/quick-start.sh
	@./scripts/quick-start.sh

## Check Setup - Проверить готовность к запуску
check-setup:
	@echo "🔍 Проверка готовности системы..."
	@echo "Node.js: $$(node --version 2>/dev/null || echo 'НЕ УСТАНОВЛЕН')"
	@echo "npm: $$(npm --version 2>/dev/null || echo 'НЕ УСТАНОВЛЕН')"
	@echo "Claude Code: $$(claude --version 2>/dev/null || echo 'НЕ УСТАНОВЛЕН')"
	@echo "Git: $$(git --version 2>/dev/null || echo 'НЕ УСТАНОВЛЕН')"
	@echo ".env файл: $$([ -f .env ] && echo '✅ Найден' || echo '❌ Отсутствует')"
	@echo "Зависимости: $$([ -d node_modules ] && echo '✅ Установлены' || echo '❌ Не установлены')"

## Show Config - Показать текущую конфигурацию
show-config:
	@echo "📊 Текущая конфигурация:"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@if [ -f .env ]; then \
		echo "🔑 LINEAR_API_TOKEN: $$(grep LINEAR_API_TOKEN .env | cut -d'=' -f2 | cut -c1-20)..."; \
		echo "🏢 LINEAR_ORGANIZATION_ID: $$(grep LINEAR_ORGANIZATION_ID .env | cut -d'=' -f2)"; \
		echo "📁 PROJECT_ROOT_DIR: $$(grep PROJECT_ROOT_DIR .env | cut -d'=' -f2)"; \
		echo "🌐 WEBHOOK_PORT: $$(grep WEBHOOK_PORT .env | cut -d'=' -f2 || echo '3005')"; \
	else \
		echo "❌ .env файл не найден"; \
	fi