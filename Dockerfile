FROM python:3.11-slim

# System deps (tiny, helps scientific libs/builds; safe to keep)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    build-essential curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Flask dependencies (minimal for production)
COPY requirements-flask.txt /app/requirements-flask.txt
RUN pip install --no-cache-dir -r /app/requirements-flask.txt

# Copy Flask application
COPY app /app/app
COPY wsgi.py /app/wsgi.py

# ✅ Copy all necessary application directories
COPY orchestrator /app/orchestrator
COPY scripts /app/scripts
COPY start.sh /app/start.sh
RUN chmod +x /app/scripts/*.sh /app/start.sh || true

# Runtime env
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=10000 \
    FLASK_ENV=production

# Render will probe this; we bind to 0.0.0.0:$PORT
EXPOSE ${PORT}

# Health check for container health monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/healthz || exit 1

# Use Gunicorn for production WSGI deployment
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--workers", "2", "--worker-class", "sync", "--access-logfile", "-", "wsgi:app"]
