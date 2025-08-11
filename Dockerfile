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
COPY templates /app/templates
COPY static /app/static
COPY start.sh /app/start.sh
RUN chmod +x /app/scripts/*.sh /app/start.sh || true

# Runtime env
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Render will probe this; we bind to 0.0.0.0:$PORT
EXPOSE ${PORT}

# ✅ Use start.sh as primary with fallback to resilient launcher
CMD ["./start.sh"]
