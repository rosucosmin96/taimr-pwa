.PHONY: help install dev build test lint format clean

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	@$(MAKE) -C backend install
	@echo "Installing frontend dependencies..."
	@$(MAKE) -C frontend install

dev: ## Start development servers
	@echo "Starting development servers..."
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Start backend development server
	@$(MAKE) -C backend dev

dev-frontend: ## Start frontend development server
	@$(MAKE) -C frontend dev

build: ## Build both frontend and backend
	@$(MAKE) -C backend build
	@$(MAKE) -C frontend build

test: ## Run all tests
	@$(MAKE) -C backend test
	@$(MAKE) -C frontend test

lint: ## Run linting on both frontend and backend
	@$(MAKE) -C backend lint
	@$(MAKE) -C frontend lint

format: ## Format code in both frontend and backend
	@$(MAKE) -C backend format
	@$(MAKE) -C frontend format

clean: ## Clean build artifacts
	@$(MAKE) -C backend clean
	@$(MAKE) -C frontend clean
