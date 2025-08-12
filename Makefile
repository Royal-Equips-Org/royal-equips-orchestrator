# Makefile for the Royal Equips Orchestrator

.PHONY: help install run api dashboard holo classic docker-build docker-up clean security

help:
	@echo "Common tasks:"
	@echo "  make install        Install dependencies into a virtualenv"
	@echo "  make run            Run the orchestrator API locally"
	@echo "  make api            Alias for run"
	@echo "  make dashboard      Start the Holographic Control Center (default)"
	@echo "  make holo           Start the Holographic Control Center"
	@echo "  make classic        Start the Classic Control Center"
	@echo "  make docker-build   Build Docker image"
	@echo "  make docker-up      Run docker-compose stack"
	@echo "  make clean          Remove build artifacts"
	@echo "  make security       Run local security scans (bandit & pip‑audit)"

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
	rm -rf .venv __pycache__ royal_equips_orchestrator/__pycache__ royal_equips_orchestrator/orchestrator/*/__pycache__

security:
	@echo "Running security scans..."
	@python scripts/run_security_checks.py