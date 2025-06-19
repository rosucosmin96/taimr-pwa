.PHONY: help install dev build test lint format clean

help: ## Show frontend help
	@echo "Frontend commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install frontend dependencies
	npm install

dev: ## Start frontend development server
	npm run dev

build: ## Build frontend for production
	npm run build

test: ## Run frontend tests
	npm test

lint: ## Run frontend linting
	npm run lint

format: ## Format frontend code
	npm run format

clean: ## Clean frontend build artifacts
	rm -rf dist node_modules
