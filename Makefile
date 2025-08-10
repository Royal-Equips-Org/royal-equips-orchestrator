# Makefile for the Royal Equips Orchestrator

.PHONY: help install run api dashboard docker-build docker-up clean security

help:
	@echo "Common tasks:"
	@echo "  make install        Install dependencies into a virtualenv"
	@echo "  make run            Run the orchestrator API locally"
	@echo "  make api            Alias for run"
	@echo "  make dashboard      Start the Streamlit control center"
	@echo "  make docker-build   Build Docker image"
	@echo "  make docker-up      Run docker-compose stack"
	@echo "  make clean          Remove build artifacts"
	@echo "  make security       Run local security scans (bandit & pip‑audit)"

install:
	python3 -m venv .venv && \
	.venv/bin/pip install --upgrade pip && \
	.venv/bin/pip install -r requirements.txt

run api:
	@echo "Starting FastAPI server..."
	@export $(grep -v '^#' .env | xargs) && \
	.venv/bin/uvicorn scripts.launch_api:app --reload

dashboard:
	@echo "Starting Streamlit dashboard..."
	@export $(grep -v '^#' .env | xargs) && \
	.venv/bin/streamlit run orchestrator/control_center/app.py

holo:
	@echo "Starting Holographic Control Center..."
	@export $(grep -v '^#' .env | xargs) && \
	.venv/bin/streamlit run orchestrator/control_center/holo_app.py

docker-build:
	docker build -t royal-equips-orchestrator .

docker-up:
	docker compose up --build

clean:
	rm -rf .venv __pycache__ royal_equips_orchestrator/__pycache__ royal_equips_orchestrator/orchestrator/*/__pycache__

security:
	@echo "Running security scans..."
	@python scripts/run_security_checks.py