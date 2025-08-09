FROM python:3.11-slim

# System deps (tiny, helps scientific libs/builds; safe to keep)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    build-essential curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first for caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# ✅ Correct repo paths
COPY orchestrator /app/orchestrator
COPY scripts /app/scripts

# Runtime env
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Render will probe this; we bind to 0.0.0.0:$PORT
EXPOSE ${PORT}

# ✅ Point uvicorn at your FastAPI app module and use $PORT
# Adjust 'orchestrator.api:app' if your app object lives elsewhere (see note below).
CMD ["bash", "-lc", "uvicorn orchestrator.api:app --host 0.0.0.0 --port ${PORT}"]
