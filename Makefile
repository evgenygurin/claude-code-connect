# Claude Code Connect - Makefile
.PHONY: help install dev build start test lint format typecheck clean init test-connection logs

# Default target
.DEFAULT_GOAL := help

## Help - Show available commands
help:
	@echo "Commands: dev build test quality init clean status"

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