FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements and install first for better caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the application code
COPY royal_equips_orchestrator /app/royal_equips_orchestrator
COPY scripts /app/scripts

# Default environment variables (can be overridden)
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Expose port for the API
EXPOSE ${PORT}

# Run the orchestrator API by default
CMD ["uvicorn", "royal_equips_orchestrator.scripts.run_orchestrator:app", "--host", "0.0.0.0", "--port", "8000"]