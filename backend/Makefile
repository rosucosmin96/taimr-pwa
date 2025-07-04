.PHONY: help install dev build test test-setup lint format clean

help: ## Show backend help
	@echo "Backend commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install backend dependencies
	uv pip install -r requirements.txt

dev: ## Start backend development server
	source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

build: ## Build backend (compile check)
	source .venv/bin/activate && python -m py_compile app/main.py

test: ## Run backend tests
	source .venv/bin/activate && python -m pytest

test-setup: ## Test Epic-2 implementation
	source .venv/bin/activate && python test_setup.py

lint: ## Run backend linting
	source .venv/bin/activate && ruff check .

format: ## Format backend code
	source .venv/bin/activate && black .

clean: ## Clean backend artifacts
	find . -type d -name __pycache__ -delete
	find . -name "*.pyc" -delete
