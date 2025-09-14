# Makefile for the Royal Equips Orchestrator

.PHONY: help install run api dashboard holo classic docker-build docker-up clean security
.PHONY: setup format lint typecheck test coverage scan ci

help:
	@echo "Development Commands:"
	@echo "  make setup          Setup development environment"
	@echo "  make format         Format code with black and ruff"
	@echo "  make lint           Run linting (ruff)"
	@echo "  make typecheck      Run type checking (mypy)"
	@echo "  make test           Run tests with pytest"
	@echo "  make coverage       Run tests with coverage"
	@echo "  make scan           Run security scans (bandit)"
	@echo "  make ci             Run complete CI pipeline locally"
	@echo ""
	@echo "Application Commands:"
	@echo "  make install        Install dependencies into a virtualenv"
	@echo "  make run            Run the orchestrator API locally"
	@echo "  make api            Alias for run"
	@echo "  make dashboard      Start the Holographic Control Center (default)"
	@echo "  make holo           Start the Holographic Control Center"
	@echo "  make classic        Start the Classic Control Center"
	@echo "  make docker-build   Build Docker image"
	@echo "  make docker-up      Run docker-compose stack"
	@echo "  make clean          Remove build artifacts"
	@echo "  make security       Run legacy security scans"

# Development environment setup
setup:
	@echo "Setting up development environment..."
	python3 -m venv .venv || true
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -e ".[dev]" || .venv/bin/pip install -r requirements.txt
	@echo "✅ Development environment ready"

# Code quality
format:
	@echo "Formatting code..."
	black --line-length 88 .
	ruff check --fix .
	@echo "✅ Code formatted"

lint:
	@echo "Running linter..."
	ruff check .
	@echo "✅ Linting complete"

typecheck:
	@echo "Running type checker..."
	mypy royal_mcp/ --ignore-missing-imports
	@echo "✅ Type checking complete"

test:
	@echo "Running tests..."
	python -m pytest tests/ -v --tb=short
	@echo "✅ Tests complete"

coverage:
	@echo "Running tests with coverage..."
	python -m pytest tests/ -v --cov=royal_mcp --cov-report=term-missing --cov-report=xml
	@echo "✅ Coverage complete"

scan:
	@echo "Running security scans..."
	bandit -r royal_mcp/ api/ app/ orchestrator/ -f json -o bandit-report.json || true
	bandit -r royal_mcp/ api/ app/ orchestrator/ --skip B101 || true
	vulture royal_mcp/ api/ app/ orchestrator/ --min-confidence 80 || true
	@echo "✅ Security scan complete"

# Complete CI pipeline
ci: lint typecheck test scan
	@echo "✅ Complete CI pipeline successful"

# Legacy commands (preserved for compatibility)
install:
	python3 -m venv .venv && \
	.venv/bin/pip install --upgrade pip && \
	.venv/bin/pip install -r requirements.txt

run api:
	@echo "Starting Flask server..."
	@export $(grep -v '^#' .env | xargs) && \
	.venv/bin/python wsgi.py

dashboard holo:
	@echo "Starting Holographic Control Center..."
	@export $(grep -v '^#' .env | xargs) && \
	.venv/bin/streamlit run orchestrator/control_center/holo_app.py

classic:
	@echo "Starting Classic Control Center..."
	@export $(grep -v '^#' .env | xargs) && \
	.venv/bin/streamlit run orchestrator/control_center/app.py

docker-build:
	docker build -t royal-equips-orchestrator .

docker-up:
	docker compose up --build

clean:
	rm -rf .venv __pycache__ royal_mcp/__pycache__ royal_mcp/*/__pycache__ 
	rm -rf .pytest_cache .coverage coverage.xml .mypy_cache .ruff_cache
	rm -rf bandit-report.json vulture-whitelist.py
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

security:
	@echo "Running security scans..."
	@python scripts/run_security_checks.py