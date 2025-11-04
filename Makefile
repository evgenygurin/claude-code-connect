# Claude Code Connect - Makefile
.PHONY: help install dev build start test lint format typecheck clean init test-connection logs quick-start check-setup show-config

# Default target
.DEFAULT_GOAL := help

## Help - Show available commands
help:
	@echo "🚀 Claude Code Connect - Доступные команды:"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🎯 БЫСТРЫЙ СТАРТ:"
	@echo "  quick-start          Полная автоматическая настройка и запуск"
	@echo "  check-setup          Проверить готовность системы"
	@echo "  show-config          Показать текущую конфигурацию"
	@echo ""
	@echo "🔧 РАЗРАБОТКА:"
	@echo "  dev                  Запуск dev сервера с auto-reload"
	@echo "  build                Компиляция TypeScript"
	@echo "  start                Запуск production сервера"
	@echo ""
	@echo "🧪 ТЕСТИРОВАНИЕ:"
	@echo "  test                 Запуск всех unit тестов"
	@echo "  test-watch           Запуск тестов в watch mode"
	@echo "  test-coverage        Тесты с coverage отчетом"
	@echo "  test-connection      Проверка Linear API подключения"
	@echo "  test-integration     Интеграционные тесты"
	@echo "  test-workflow        Workflow тесты"
	@echo "  test-agents          Agent scenario тесты"
	@echo "  test-all             ВСЕ тесты (unit + integration + workflow + agents)"
	@echo ""
	@echo "🔐 БЕЗОПАСНОСТЬ:"
	@echo "  security-test        Тесты безопасности"
	@echo "  security-verbose     Тесты безопасности (verbose)"
	@echo "  security-report      Генерация security отчета"
	@echo "  security-monitor     Мониторинг безопасности"
	@echo "  security-all         ВСЕ проверки безопасности"
	@echo ""
	@echo "🔗 LINEAR INTEGRATION:"
	@echo "  linear-create        Создать Linear issues"
	@echo "  linear-check         Проверить Linear issues"
	@echo ""
	@echo "📊 КАЧЕСТВО КОДА:"
	@echo "  quality              Все проверки (typecheck + lint + format)"
	@echo "  typecheck            TypeScript проверка типов"
	@echo "  lint                 ESLint проверка кода"
	@echo "  format               Форматирование с Prettier"
	@echo "  code-duplicates      Поиск дублирующегося кода"
	@echo ""
	@echo "🌐 GIT ОПЕРАЦИИ:"
	@echo "  git-status           Git статус"
	@echo "  git-add              Stage все изменения"
	@echo "  git-commit           Commit (нужен MESSAGE=\"...\")"
	@echo "  git-push             Push в remote"
	@echo "  git-pull             Pull из remote"
	@echo "  commit-push          Commit + Push (нужен MESSAGE=\"...\")"
	@echo ""
	@echo "🛠️  УТИЛИТЫ:"
	@echo "  logs                 Показать логи сервера"
	@echo "  clean                Очистить build артефакты"
	@echo "  sessions-clean       Очистить сессии"
	@echo "  sessions-list        Список всех сессий"
	@echo "  health               Проверка здоровья сервера"
	@echo "  port-check           Проверка порта 3005"
	@echo "  version              Информация о версиях"
	@echo ""
	@echo "🚢 CI/CD:"
	@echo "  ci-check             Все CI проверки"
	@echo "  pre-commit           Pre-commit проверки"
	@echo "  release-prep         Подготовка к release"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "💡 Для первого запуска: make quick-start"
	@echo "📖 Больше команд: grep '^[a-z-]*:' Makefile"

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
	@docker run -p 3005:3005 --env-file .env claude-code-connect

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

## Testing Commands

## Test Watch - Run tests in watch mode
test-watch:
	@npm run test:watch

## Test Coverage - Run tests with coverage
test-coverage:
	@npm run test:coverage && echo "✅ Coverage OK"

## Test Integration - Run integration tests
test-integration:
	@npm run test:integration && echo "✅ Integration OK"

## Test Integration Bug Fix - Run bug-fix scenario
test-integration-bug-fix:
	@npm run test:integration:bug-fix && echo "✅ Bug-fix scenario OK"

## Test Integration Multi Agent - Run multi-agent scenario
test-integration-multi-agent:
	@npm run test:integration:multi-agent && echo "✅ Multi-agent scenario OK"

## Test Integration Stress - Run stress tests
test-integration-stress:
	@npm run test:integration:stress && echo "✅ Stress test OK"

## Test Workflow - Run workflow tests
test-workflow:
	@npm run test:workflow && echo "✅ Workflow OK"

## Test Agents - Run agent scenario tests
test-agents:
	@npm run test:agents && echo "✅ Agents OK"

## Test Demo - Run test demo
test-demo:
	@npm run test:demo

## Test Analyze - Analyze test results
test-analyze:
	@npm run test:analyze

## Test Generate - Generate test code
test-generate:
	@npm run test:generate

## Test Generate All - Generate tests for all files
test-generate-all:
	@npm run test:generate-all

## Test Recommendations - Get test recommendations
test-recommendations:
	@npm run test:recommendations

## Test Filter - Run test filter script
test-filter:
	@npm run test:filter

## Test All - Run all test suites
test-all:
	@echo "🧪 Запуск ВСЕХ тестов..."
	@npm test && npm run test:integration && npm run test:workflow && npm run test:agents && echo "✅ ALL TESTS OK"

## Security Commands

## Security Test - Run security tests
security-test:
	@npm run security:test && echo "✅ Security OK"

## Security Verbose - Run security tests with verbose output
security-verbose:
	@npm run security:test:verbose

## Security Report - Generate security report
security-report:
	@npm run security:test:report && echo "✅ Security report: security-report.json"

## Security Monitor - Start security monitoring
security-monitor:
	@npm run security:monitor

## Security All - Run all security checks
security-all:
	@echo "🔐 Запуск всех security проверок..."
	@npm run security:test && npm run security:test:report && echo "✅ ALL SECURITY CHECKS OK"

## Linear Commands

## Linear Create - Create Linear issues
linear-create:
	@npm run linear:create-issues && echo "✅ Linear issues created"

## Linear Check - Check Linear issues
linear-check:
	@npm run linear:check-issues && echo "✅ Linear issues checked"

## Code Quality Commands

## Code Duplicates - Find duplicate code
code-duplicates:
	@npm run code:duplicates

## Git Commands

## Git Status - Show git status
git-status:
	@git status

## Git Add - Stage all changes
git-add:
	@git add . && echo "✅ Changes staged"

## Git Commit - Commit changes (requires MESSAGE)
git-commit: git-add
ifndef MESSAGE
	@echo "❌ Ошибка: требуется MESSAGE"
	@echo "Использование: make git-commit MESSAGE=\"Your commit message\""
	@exit 1
endif
	@git commit -m "$(MESSAGE)" && echo "✅ Committed"

## Git Push - Push to remote
git-push:
	@git push -u origin $$(git branch --show-current) && echo "✅ Pushed"

## Git Pull - Pull from remote
git-pull:
	@git pull origin $$(git branch --show-current) && echo "✅ Pulled"

## Git Branch - Show current branch
git-branch:
	@git branch --show-current

## Git Log - Show recent commits
git-log:
	@git log --oneline -10

## Commit and Push - Commit and push in one command
commit-push: git-add
ifndef MESSAGE
	@echo "❌ Ошибка: требуется MESSAGE"
	@echo "Использование: make commit-push MESSAGE=\"Your commit message\""
	@exit 1
endif
	@git commit -m "$(MESSAGE)" && git push -u origin $$(git branch --show-current) && echo "✅ Committed and pushed"

## Utility Commands

## Sessions Clean - Clean session storage
sessions-clean:
	@rm -rf .claude-sessions && echo "✅ Sessions cleaned"

## Sessions List - List all sessions
sessions-list:
	@curl -s http://localhost:3005/sessions | jq . || echo "❌ Server not running"

## Sessions Stats - Show session statistics
sessions-stats:
	@curl -s http://localhost:3005/stats | jq . || echo "❌ Server not running"

## Health - Check server health
health:
	@curl -s http://localhost:3005/health | jq . || echo "❌ Server not running"

## Config Check - Show current server configuration
config-check:
	@curl -s http://localhost:3005/config | jq . || echo "❌ Server not running"

## Port Check - Check if port 3005 is in use
port-check:
	@lsof -i :3005 || echo "✅ Port 3005 is free"

## Ngrok Start - Start ngrok tunnel
ngrok-start:
	@echo "🌐 Starting ngrok tunnel on port 3005..."
	@ngrok http 3005

## Version - Show version information
version:
	@echo "📦 Version Information:"
	@echo "Project: $$(jq -r .version package.json)"
	@echo "Node: $$(node --version)"
	@echo "npm: $$(npm --version)"
	@echo "TypeScript: $$(npx tsc --version)"

## List Scripts - List all npm scripts
list-scripts:
	@echo "📜 Available npm scripts:"
	@jq -r '.scripts | keys[]' package.json

## CI/CD Commands

## CI Check - Run all CI checks
ci-check: quality test
	@echo "✅ All CI checks passed"

## Pre Commit - Run pre-commit checks
pre-commit: quality
	@echo "✅ Pre-commit checks passed"

## Pre Push - Run pre-push checks
pre-push: ci-check
	@echo "✅ Pre-push checks passed"

## Release Prep - Prepare for release
release-prep: clean install quality test security-test build
	@echo "✅ Release preparation complete"

## Docker Commands

## Docker Build - Build Docker image
docker-build:
	@docker build -t claude-code-linear . && echo "✅ Docker image built"

## Docker Run - Run Docker container
docker-run:
	@docker run -p 3005:3005 --env-file .env claude-code-linear

## Docker Stop - Stop all running containers
docker-stop:
	@docker ps -q --filter "ancestor=claude-code-linear" | xargs -r docker stop && echo "✅ Containers stopped"

## Complete Workflows

## Full Test - Complete test suite
full-test: clean install quality test-all security-all
	@echo "✅ Full test suite complete"

## Update - Update from remote and reinstall
update: git-pull install
	@echo "✅ Updated and reinstalled"

## Reinstall - Clean and reinstall dependencies
reinstall: clean install
	@echo "✅ Dependencies reinstalled"