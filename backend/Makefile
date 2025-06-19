.PHONY: help install dev build test lint format clean

help: ## Show backend help
	@echo "Backend commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install backend dependencies
	uv pip install -r requirements.txt

dev: ## Start backend development server
	source .venv/bin/activate && uvicorn main:app --reload

build: ## Build backend (compile check)
	source .venv/bin/activate && python -m py_compile main.py

test: ## Run backend tests
	source .venv/bin/activate && python -m pytest

lint: ## Run backend linting
	source .venv/bin/activate && ruff check .

format: ## Format backend code
	source .venv/bin/activate && black .

clean: ## Clean backend artifacts
	find . -type d -name __pycache__ -delete
	find . -name "*.pyc" -delete
