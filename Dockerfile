FROM python:3.11-slim

# System deps (tiny, helps scientific libs/builds; safe to keep)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    build-essential curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first for caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# ✅ Copy all necessary application directories
COPY api /app/api
COPY orchestrator /app/orchestrator
COPY scripts /app/scripts
COPY start.sh /app/start.sh
RUN chmod +x /app/scripts/*.sh /app/start.sh || true

# Runtime env
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Render will probe this; we bind to 0.0.0.0:$PORT
EXPOSE ${PORT}

# Health check for container health monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# ✅ Use start.sh as primary with fallback to resilient launcher
CMD ["./start.sh"]
