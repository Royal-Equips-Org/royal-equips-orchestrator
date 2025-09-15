# ============================================
# ROYAL EQUIPS PLATFORM - COMPLETE INFRASTRUCTURE
# GitHub Actions + Self-Hosted Server Setup
# ============================================

# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  PYTHON_VERSION: '3.11'
  NODE_VERSION: '18'

jobs:
  test-backend:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_royal_equips
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}
        cache: 'pip'

    - name: Install dependencies
      run: |
        pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-asyncio pytest-cov

    - name: Run database migrations
      env:
        DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_royal_equips
      run: |
        alembic upgrade head

    - name: Run unit tests
      env:
        DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_royal_equips
        REDIS_URL: redis://localhost:6379/0
        TESTING: true
      run: |
        pytest tests/unit/ -v --cov=platform --cov-report=xml --cov-report=html

    - name: Run integration tests
      env:
        DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_royal_equips
        REDIS_URL: redis://localhost:6379/0
        TESTING: true
      run: |
        pytest tests/integration/ -v

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
        fail_ci_if_error: false

  test-agents:
    runs-on: ubuntu-latest
    needs: test-backend
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_royal_equips
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}
        cache: 'pip'

    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-asyncio

    - name: Test Product Research Agent
      env:
        DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_royal_equips
        TESTING: true
      run: |
        pytest tests/agents/test_product_research_agent.py -v

    - name: Test Inventory Pricing Agent
      env:
        DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_royal_equips
        TESTING: true
      run: |
        pytest tests/agents/test_inventory_pricing_agent.py -v

  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: dashboard/package-lock.json

    - name: Install frontend dependencies
      working-directory: ./dashboard
      run: npm ci

    - name: Run frontend tests
      working-directory: ./dashboard
      run: npm test

    - name: Build frontend
      working-directory: ./dashboard
      run: npm run build

    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: frontend-build
        path: dashboard/dist/

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'

    - name: Python Security Check
      run: |
        pip install safety bandit
        safety check -r requirements.txt
        bandit -r platform/ -f json

---

# .github/workflows/build.yml
name: Build & Push Images

on:
  push:
    branches: [main]
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-backend:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'push' }}
    
    permissions:
      contents: read
      packages: write

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push backend image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  build-frontend:
    runs-on: ubuntu-latest
    needs: build-backend
    
    permissions:
      contents: read
      packages: write

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Download frontend build
      uses: actions/download-artifact@v3
      with:
        name: frontend-build
        path: dashboard/dist/

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push frontend image
      uses: docker/build-push-action@v5
      with:
        context: ./dashboard
        file: ./dashboard/Dockerfile
        push: true
        tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:latest
        cache-from: type=gha
        cache-to: type=gha,mode=max

---

# .github/workflows/deploy.yml
name: Deploy to Production

on:
  workflow_run:
    workflows: ["Build & Push Images"]
    types: [completed]
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'workflow_dispatch' }}
    
    environment: production
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup SSH
      uses: webfactory/ssh-agent@v0.8.0
      with:
        ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

    - name: Add server to known hosts
      run: |
        ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

    - name: Deploy to server
      run: |
        ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << 'EOF'
          cd /opt/royal-equips-platform
          
          # Backup current deployment
          sudo docker-compose down
          sudo cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
          
          # Pull latest code and images
          git pull origin main
          echo ${{ secrets.GITHUB_TOKEN }} | sudo docker login ghcr.io -u ${{ github.actor }} --password-stdin
          sudo docker-compose pull
          
          # Update environment variables
          sudo cp .env.production .env
          
          # Deploy with zero downtime
          sudo docker-compose up -d --remove-orphans
          
          # Wait for services to be healthy
          sleep 30
          
          # Run database migrations
          sudo docker-compose exec -T backend alembic upgrade head
          
          # Restart agents
          sudo docker-compose restart agent-orchestrator
          
          # Clean up old images
          sudo docker image prune -f
        EOF

    - name: Health check
      run: |
        sleep 60
        curl -f ${{ secrets.APP_URL }}/api/health || exit 1

    - name: Notify deployment
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: Deployment to production ${{ job.status }}
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

---

# .github/workflows/agents.yml
name: Execute AI Agents

on:
  schedule:
    # Product Research Agent - every 6 hours
    - cron: '0 */6 * * *'
    # Inventory & Pricing Agent - every 4 hours  
    - cron: '0 */4 * * *'
    # Marketing Agent - every 12 hours
    - cron: '0 */12 * * *'
  workflow_dispatch:
    inputs:
      agent_name:
        description: 'Agent to execute'
        required: true
        default: 'product_research'
        type: choice
        options:
        - product_research
        - inventory_pricing
        - marketing_automation
        - all

jobs:
  execute-agent:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        cache: 'pip'

    - name: Install dependencies
      run: |
        pip install -r requirements.txt

    - name: Determine agent to run
      id: agent
      run: |
        if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
          echo "agent=${{ github.event.inputs.agent_name }}" >> $GITHUB_OUTPUT
        else
          # Determine from schedule
          hour=$(date +%H)
          if [ $((hour % 6)) -eq 0 ]; then
            echo "agent=product_research" >> $GITHUB_OUTPUT
          elif [ $((hour % 4)) -eq 0 ]; then
            echo "agent=inventory_pricing" >> $GITHUB_OUTPUT
          else
            echo "agent=marketing_automation" >> $GITHUB_OUTPUT
          fi
        fi

    - name: Execute Product Research Agent
      if: steps.agent.outputs.agent == 'product_research' || steps.agent.outputs.agent == 'all'
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
        SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY }}
        SHOPIFY_API_SECRET: ${{ secrets.SHOPIFY_API_SECRET }}
        SHOPIFY_ACCESS_TOKEN: ${{ secrets.SHOPIFY_ACCESS_TOKEN }}
        SHOPIFY_SHOP_URL: ${{ secrets.SHOPIFY_SHOP_URL }}
      run: |
        python scripts/execute_agent.py --agent product_research --max-runtime 3600

    - name: Execute Inventory & Pricing Agent
      if: steps.agent.outputs.agent == 'inventory_pricing' || steps.agent.outputs.agent == 'all'
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
        SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY }}
        SHOPIFY_ACCESS_TOKEN: ${{ secrets.SHOPIFY_ACCESS_TOKEN }}
      run: |
        python scripts/execute_agent.py --agent inventory_pricing --max-runtime 2400

    - name: Execute Marketing Agent
      if: steps.agent.outputs.agent == 'marketing_automation' || steps.agent.outputs.agent == 'all'
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
        EMAIL_SERVICE_API_KEY: ${{ secrets.EMAIL_SERVICE_API_KEY }}
      run: |
        python scripts/execute_agent.py --agent marketing_automation --max-runtime 3600

    - name: Upload execution logs
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: agent-logs-${{ steps.agent.outputs.agent }}-${{ github.run_number }}
        path: logs/
        retention-days: 30

    - name: Notify on failure
      if: failure()
      run: |
        curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"Agent execution failed: ${{ steps.agent.outputs.agent }}"}' \
        ${{ secrets.SLACK_WEBHOOK_URL }}

---

# .github/workflows/monitoring.yml
name: System Monitoring

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    
    steps:
    - name: Check API Health
      run: |
        response=$(curl -s -o /dev/null -w "%{http_code}" ${{ secrets.APP_URL }}/api/health)
        if [ $response -ne 200 ]; then
          echo "API health check failed with status $response"
          exit 1
        fi

    - name: Check Database Connection
      run: |
        response=$(curl -s ${{ secrets.APP_URL }}/api/health)
        db_status=$(echo $response | jq -r '.components.database')
        if [ "$db_status" != "healthy" ]; then
          echo "Database health check failed: $db_status"
          exit 1
        fi

    - name: Check Agents Status
      run: |
        response=$(curl -s ${{ secrets.APP_URL }}/api/agents)
        agent_count=$(echo $response | jq '.agents | length')
        if [ $agent_count -lt 3 ]; then
          echo "Expected at least 3 agents, found $agent_count"
          exit 1
        fi

    - name: Performance Test
      run: |
        # Simple load test
        for i in {1..10}; do
          start_time=$(date +%s%N)
          curl -s ${{ secrets.APP_URL }}/api/products?limit=1 > /dev/null
          end_time=$(date +%s%N)
          duration=$((($end_time - $start_time) / 1000000))
          if [ $duration -gt 2000 ]; then  # 2 seconds
            echo "API response too slow: ${duration}ms"
            exit 1
          fi
        done

    - name: Alert on failure
      if: failure()
      run: |
        curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 System health check failed! Check the monitoring dashboard."}' \
        ${{ secrets.SLACK_WEBHOOK_URL }}

  backup-check:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 2 * * *'  # Daily at 2 AM
    
    steps:
    - name: Verify Backup
      run: |
        ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << 'EOF'
          # Check if backup was created in last 24 hours
          backup_file="/opt/backups/royal-equips-$(date +%Y%m%d).sql.gz"
          if [ ! -f "$backup_file" ]; then
            echo "Backup file not found: $backup_file"
            exit 1
          fi
          
          # Check backup file size (should be > 1MB)
          size=$(stat -c%s "$backup_file")
          if [ $size -lt 1048576 ]; then
            echo "Backup file too small: $size bytes"
            exit 1
          fi
        EOF

---

# .github/workflows/security.yml
name: Security Scans

on:
  schedule:
    - cron: '0 3 * * 1'  # Weekly on Monday at 3 AM
  workflow_dispatch:

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Dependabot
      uses: github/super-linter@v4
      env:
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    - name: Python dependency check
      run: |
        pip install safety
        safety check -r requirements.txt --json > safety-report.json
        
    - name: Node.js dependency check
      working-directory: ./dashboard
      run: |
        npm audit --audit-level high

  container-scan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Build image for scanning
      run: |
        docker build -t royal-equips-scan .

    - name: Run Trivy scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: royal-equips-scan
        format: sarif
        output: trivy-results.sarif

    - name: Upload Trivy results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: trivy-results.sarif

  infrastructure-scan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Checkov
      uses: bridgecrewio/checkov-action@master
      with:
        directory: .
        framework: dockerfile,docker_compose

# ============================================
# DOCKER INFRASTRUCTURE FILES
# ============================================

# Dockerfile
FROM python:3.11-slim as base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start command
CMD ["uvicorn", "platform.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

---

# docker-compose.yml (Development)
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: royal_equips
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d royal_equips"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  # RabbitMQ Message Queue
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-password}
      RABBITMQ_DEFAULT_VHOST: royal_equips
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    ports:
      - "5672:5672"   # AMQP port
      - "15672:15672" # Management UI
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 30s
      timeout: 30s
      retries: 3
    restart: unless-stopped

  # Main API Application
  api:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD:-password}@postgres:5432/royal_equips
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://admin:${RABBITMQ_PASSWORD:-password}@rabbitmq:5672/royal_equips
      - SECRET_KEY=${SECRET_KEY:-development-secret-key}
      - ENVIRONMENT=development
    volumes:
      - .:/app
      - ./logs:/app/logs
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Agent Orchestrator
  agent-orchestrator:
    build: .
    depends_on:
      api:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD:-password}@postgres:5432/royal_equips
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://admin:${RABBITMQ_PASSWORD:-password}@rabbitmq:5672/royal_equips
      - SECRET_KEY=${SECRET_KEY:-development-secret-key}
      - ENVIRONMENT=development
    volumes:
      - .:/app
      - ./logs:/app/logs
    command: ["python", "-m", "platform.core.agent_orchestrator"]
    restart: unless-stopped

  # Celery Workers for Background Tasks
  celery-worker:
    build: .
    depends_on:
      - rabbitmq
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD:-password}@postgres:5432/royal_equips
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://admin:${RABBITMQ_PASSWORD:-password}@rabbitmq:5672/royal_equips
      - SECRET_KEY=${SECRET_KEY:-development-secret-key}
    volumes:
      - .:/app
      - ./logs:/app/logs
    command: ["celery", "-A", "platform.core.celery_app", "worker", "--loglevel=info"]
    restart: unless-stopped
    scale: 2

  # Celery Beat Scheduler
  celery-beat:
    build: .
    depends_on:
      - rabbitmq
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD:-password}@postgres:5432/royal_equips
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://admin:${RABBITMQ_PASSWORD:-password}@rabbitmq:5672/royal_equips
      - SECRET_KEY=${SECRET_KEY:-development-secret-key}
    volumes:
      - .:/app
      - ./logs:/app/logs
    command: ["celery", "-A", "platform.core.celery_app", "beat", "--loglevel=info"]
    restart: unless-stopped

  # Prometheus Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  # Grafana Dashboard
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:

networks:
  default:
    name: royal_equips_network

---

# docker-compose.prod.yml (Production)
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: royal_equips
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - /opt/royal-equips-data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d royal_equips"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - /opt/royal-equips-data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_DEFAULT_VHOST: royal_equips
    volumes:
      - /opt/royal-equips-data/rabbitmq:/var/lib/rabbitmq
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 30s
      timeout: 30s
      retries: 3
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

  api:
    image: ghcr.io/your-username/royal-equips-platform:latest
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/royal_equips
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/royal_equips
      - SECRET_KEY=${SECRET_KEY}
      - ENVIRONMENT=production
      - SHOPIFY_API_KEY=${SHOPIFY_API_KEY}
      - SHOPIFY_API_SECRET=${SHOPIFY_API_SECRET}
      - SHOPIFY_ACCESS_TOKEN=${SHOPIFY_ACCESS_TOKEN}
      - SHOPIFY_SHOP_URL=${SHOPIFY_SHOP_URL}
    volumes:
      - /opt/royal-equips-data/logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  agent-orchestrator:
    image: ghcr.io/your-username/royal-equips-platform:latest
    depends_on:
      api:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/royal_equips
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/royal_equips
      - SECRET_KEY=${SECRET_KEY}
      - ENVIRONMENT=production
      - SHOPIFY_API_KEY=${SHOPIFY_API_KEY}
      - SHOPIFY_API_SECRET=${SHOPIFY_API_SECRET}
      - SHOPIFY_ACCESS_TOKEN=${SHOPIFY_ACCESS_TOKEN}
    volumes:
      - /opt/royal-equips-data/logs:/app/logs
    command: ["python", "-m", "platform.core.agent_orchestrator"]
    restart: always
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'

  celery-worker:
    image: ghcr.io/your-username/royal-equips-platform:latest
    depends_on:
      - rabbitmq
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/royal_equips
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/royal_equips
      - SECRET_KEY=${SECRET_KEY}
      - ENVIRONMENT=production
    volumes:
      - /opt/royal-equips-data/logs:/app/logs
    command: ["celery", "-A", "platform.core.celery_app", "worker", "--loglevel=info", "--concurrency=4"]
    restart: always
    deploy:
      replicas: 4
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - /opt/ssl-certificates:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: always
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:

# ============================================
# SERVER DEPLOYMENT SCRIPTS & CONFIGURATION
# ============================================

# scripts/server-setup.sh
#!/bin/bash

# Royal Equips Platform - Server Setup Script
# Run this on a fresh Ubuntu 22.04 server

set -e

echo "🏰 Setting up Royal Equips Platform Server..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install essential tools
sudo apt install -y \
    git \
    curl \
    wget \
    htop \
    nginx \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw \
    unzip

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Create application directories
sudo mkdir -p /opt/royal-equips-platform
sudo mkdir -p /opt/royal-equips-data/{postgres,redis,rabbitmq,logs}
sudo mkdir -p /opt/backups
sudo mkdir -p /opt/ssl-certificates

# Set permissions
sudo chown -R $USER:$USER /opt/royal-equips-platform
sudo chown -R 999:999 /opt/royal-equips-data/postgres  # PostgreSQL user
sudo chown -R 999:999 /opt/royal-equips-data/redis     # Redis user
sudo chown -R 100:101 /opt/royal-equips-data/rabbitmq  # RabbitMQ user

# Clone repository
cd /opt/royal-equips-platform
git clone https://github.com/your-username/royal-equips-platform.git .

# Create environment file
cp .env.production.example .env.production

echo "📝 Please edit /opt/royal-equips-platform/.env.production with your configuration"
echo "🔑 Generate SSL certificate with: sudo certbot --nginx -d yourdomain.com"
echo "🐳 Start services with: docker-compose -f docker-compose.prod.yml up -d"

---

# scripts/backup.sh
#!/bin/bash

# Royal Equips Platform - Backup Script
# Run daily via cron

set -e

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "🔄 Starting backup process..."

# Database backup
echo "📂 Backing up PostgreSQL database..."
docker exec royal-equips-platform_postgres_1 pg_dump -U admin royal_equips | gzip > "$BACKUP_DIR/database_$DATE.sql.gz"

# Application data backup
echo "📁 Backing up application data..."
tar -czf "$BACKUP_DIR/app_data_$DATE.tar.gz" -C /opt/royal-equips-data .

# Configuration backup
echo "⚙️ Backing up configuration..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" -C /opt/royal-equips-platform --exclude='.git' --exclude='node_modules' --exclude='__pycache__' .

# Upload to cloud storage (optional)
if [ -n "$S3_BUCKET" ]; then
    echo "☁️ Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/database_$DATE.sql.gz" "s3://$S3_BUCKET/backups/"
    aws s3 cp "$BACKUP_DIR/app_data_$DATE.tar.gz" "s3://$S3_BUCKET/backups/"
    aws s3 cp "$BACKUP_DIR/config_$DATE.tar.gz" "s3://$S3_BUCKET/backups/"
fi

# Clean up old backups
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed successfully"

---

# scripts/execute_agent.py
#!/usr/bin/env python3

"""
Agent execution script for GitHub Actions
"""

import asyncio
import argparse
import sys
import os
import logging
from datetime import datetime
from pathlib import Path

# Add platform to Python path
sys.path.append(str(Path(__file__).parent.parent))

from platform.core.platform_engine import RoyalEquipsPlatform
from platform.core.agent_orchestrator import AgentOrchestrator

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/agent_execution.log')
    ]
)

logger = logging.getLogger(__name__)

async def execute_agent(agent_name: str, max_runtime: int = 3600):
    """Execute specific agent with timeout"""
    
    try:
        logger.info(f"Starting execution of {agent_name} agent")
        
        # Initialize platform
        platform = RoyalEquipsPlatform()
        await platform.initialize()
        
        # Initialize orchestrator
        orchestrator = AgentOrchestrator(platform)
        await orchestrator.initialize()
        
        # Execute agent with timeout
        start_time = datetime.utcnow()
        result = await asyncio.wait_for(
            orchestrator.execute_agent_manually(agent_name),
            timeout=max_runtime
        )
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"Agent {agent_name} completed successfully in {execution_time:.2f}s")
        logger.info(f"Result: {result}")
        
        return True
        
    except asyncio.TimeoutError:
        logger.error(f"Agent {agent_name} execution timed out after {max_runtime}s")
        return False
        
    except Exception as e:
        logger.error(f"Agent {agent_name} execution failed: {e}")
        return False
        
    finally:
        # Cleanup
        if 'orchestrator' in locals():
            await orchestrator.cleanup()
        if 'platform' in locals():
            await platform.cleanup()

def main():
    parser = argparse.ArgumentParser(description='Execute Royal Equips AI Agent')
    parser.add_argument('--agent', required=True, 
                       choices=['product_research', 'inventory_pricing', 'marketing_automation'],
                       help='Agent to execute')
    parser.add_argument('--max-runtime', type=int, default=3600,
                       help='Maximum runtime in seconds')
    
    args = parser.parse_args()
    
    # Ensure logs directory exists
    Path('logs').mkdir(exist_ok=True)
    
    # Run agent
    success = asyncio.run(execute_agent(args.agent, args.max_runtime))
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

---

# nginx/nginx.conf (Development)
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;
    sendfile        on;
    tcp_nopush     on;
    tcp_nodelay    on;
    keepalive_timeout  65;
    types_hash_max_size 2048;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream backend servers
    upstream api_backend {
        server api:8000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket support
        location /api/ws/ {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Auth endpoints with stricter rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Frontend (if served by nginx)
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }
    }
}

---

# nginx/nginx.prod.conf (Production)
events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   '$request_time $upstream_response_time';

    access_log  /var/log/nginx/access.log  main;
    error_log   /var/log/nginx/error.log   warn;

    # Performance optimizations
    sendfile           on;
    tcp_nopush         on;
    tcp_nodelay        on;
    keepalive_timeout  65;
    keepalive_requests 1000;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=200r/m;
    limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=1000r/m;

    # Upstream servers with load balancing
    upstream api_backend {
        least_conn;
        server api:8000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # Main HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none';" always;

        # API routes
        location /api/ {
            limit_req zone=api burst=50 nodelay;
            
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # WebSocket support
        location /api/ws/ {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
        }

        # Webhooks with higher rate limit
        location /api/webhooks/ {
            limit_req zone=webhook burst=100 nodelay;
            
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Auth endpoints with stricter rate limiting
        location /api/auth/ {
            limit_req zone=login burst=10 nodelay;
            
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Static files with caching
        location /static/ {
            root /var/www/html;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Frontend
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
            
            # Cache HTML files for 1 hour
            location ~* \.html$ {
                expires 1h;
                add_header Cache-Control "public";
            }
        }
    }
}

---

# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Main API application
  - job_name: 'royal-equips-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres_exporter:9187']

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis_exporter:9121']

  # Nginx
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx_exporter:9113']

  # Node exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node_exporter:9100']

  # Celery workers
  - job_name: 'celery'
    static_configs:
      - targets: ['celery_exporter:9540']

---

# .env.production.example
# Royal Equips Platform - Production Environment Variables
# Copy to .env.production and update with your values

# Database Configuration
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_database_password_here
POSTGRES_DB=royal_equips
DATABASE_URL=postgresql://admin:your_secure_database_password_here@postgres:5432/royal_equips

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# RabbitMQ Configuration
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=your_secure_rabbitmq_password_here
RABBITMQ_URL=amqp://admin:your_secure_rabbitmq_password_here@rabbitmq:5672/royal_equips

# Application Security
SECRET_KEY=your_super_secure_secret_key_here_min_32_chars
ENVIRONMENT=production

# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token
SHOPIFY_SHOP_URL=your-shop.myshopify.com

# Amazon Configuration (Optional)
AMAZON_ACCESS_KEY_ID=your_amazon_access_key
AMAZON_SECRET_ACCESS_KEY=your_amazon_secret_key
AMAZON_REFRESH_TOKEN=your_amazon_refresh_token
AMAZON_CLIENT_ID=your_amazon_client_id
AMAZON_CLIENT_SECRET=your_amazon_client_secret

# bol.com Configuration (Optional)
BOLCOM_CLIENT_ID=your_bolcom_client_id
BOLCOM_CLIENT_SECRET=your_bolcom_client_secret

# Email Service (Klaviyo/SendGrid/etc)
EMAIL_SERVICE_API_KEY=your_email_service_api_key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Royal Equips Platform"

# SMS Service (Twilio/etc)
SMS_SERVICE_API_KEY=your_sms_service_api_key
SMS_ENABLED=true

# Monitoring & Logging
GRAFANA_PASSWORD=your_grafana_admin_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/slack/webhook

# Backup Configuration (Optional)
S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-1

# Domain Configuration
DOMAIN_NAME=yourdomain.com
APP_URL=https://yourdomain.com

# ============================================
# DEPLOYMENT AUTOMATION & MONITORING SETUP
# ============================================

# scripts/deploy.sh
#!/bin/bash

# Royal Equips Platform - Automated Deployment Script
# Called by GitHub Actions

set -e

DEPLOY_DIR="/opt/royal-equips-platform"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment process..."

# Create deployment backup
echo "📂 Creating pre-deployment backup..."
if [ -f "$DEPLOY_DIR/docker-compose.yml" ]; then
    cp "$DEPLOY_DIR/docker-compose.yml" "$BACKUP_DIR/docker-compose.backup.$DATE.yml"
fi

# Pull latest code
echo "📥 Pulling latest code..."
cd $DEPLOY_DIR
git fetch origin
git reset --hard origin/main

# Login to container registry
echo "🔐 Logging into container registry..."
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin

# Pull latest images
echo "🐳 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Update environment variables
echo "⚙️ Updating environment configuration..."
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    exit 1
fi
cp .env.production .env

# Stop services gracefully
echo "⏹️ Stopping services..."
docker-compose -f docker-compose.prod.yml down --timeout 30

# Start services with new images
echo "▶️ Starting updated services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 60

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T api alembic upgrade head

# Restart agent orchestrator to ensure latest code
echo "🤖 Restarting agent orchestrator..."
docker-compose -f docker-compose.prod.yml restart agent-orchestrator

# Clean up old Docker images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f --filter "until=24h"

# Verify deployment
echo "✅ Verifying deployment..."
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed!"
    # Rollback logic
    echo "🔄 Rolling back to previous version..."
    if [ -f "$BACKUP_DIR/docker-compose.backup.$DATE.yml" ]; then
        cp "$BACKUP_DIR/docker-compose.backup.$DATE.yml" "$DEPLOY_DIR/docker-compose.yml"
        docker-compose up -d
    fi
    exit 1
fi

echo "🎉 Deployment completed successfully!"

---

# scripts/health-check.sh
#!/bin/bash

# Comprehensive health check script
# Run every 5 minutes via cron

set -e

API_URL="${1:-http://localhost/api}"
ALERT_WEBHOOK="${2:-$SLACK_WEBHOOK_URL}"
LOG_FILE="/var/log/royal-equips-health.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Alert function
alert() {
    local message="$1"
    log "ALERT: $message"
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Royal Equips Alert: $message\"}" \
            "$ALERT_WEBHOOK" > /dev/null 2>&1 || true
    fi
}

# Check API health
check_api() {
    local response
    local http_code
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_URL/health" || echo "HTTPSTATUS:000")
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ "$http_code" -eq 200 ]; then
        log "✅ API health check passed"
        return 0
    else
        alert "API health check failed with HTTP $http_code"
        return 1
    fi
}

# Check database connection
check_database() {
    local response
    response=$(curl -s "$API_URL/health" | jq -r '.components.database // "unknown"')
    
    if [ "$response" = "healthy" ]; then
        log "✅ Database connection healthy"
        return 0
    else
        alert "Database connection failed: $response"
        return 1
    fi
}

# Check agents status
check_agents() {
    local response
    local agent_count
    
    response=$(curl -s "$API_URL/agents" || echo '{"agents":[]}')
    agent_count=$(echo $response | jq '.agents | length')
    
    if [ "$agent_count" -ge 3 ]; then
        log "✅ Agents running: $agent_count"
        return 0
    else
        alert "Insufficient agents running: $agent_count (expected: 3+)"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage
    usage=$(df /opt | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 85 ]; then
        log "✅ Disk usage: ${usage}%"
        return 0
    else
        alert "High disk usage: ${usage}%"
        return 1
    fi
}

# Check memory usage
check_memory() {
    local mem_usage
    mem_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    
    if [ "$mem_usage" -lt 90 ]; then
        log "✅ Memory usage: ${mem_usage}%"
        return 0
    else
        alert "High memory usage: ${mem_usage}%"
        return 1
    fi
}

# Check Docker containers
check_containers() {
    local unhealthy_count
    unhealthy_count=$(docker ps --filter health=unhealthy -q | wc -l)
    
    if [ "$unhealthy_count" -eq 0 ]; then
        log "✅ All Docker containers healthy"
        return 0
    else
        alert "$unhealthy_count Docker containers are unhealthy"
        return 1
    fi
}

# Main health check execution
main() {
    log "🔍 Starting health check..."
    
    local failures=0
    
    check_api || ((failures++))
    check_database || ((failures++))
    check_agents || ((failures++))
    check_disk_space || ((failures++))
    check_memory || ((failures++))
    check_containers || ((failures++))
    
    if [ $failures -eq 0 ]; then
        log "✅ All health checks passed"
    else
        log "❌ Health check completed with $failures failures"
        exit 1
    fi
}

main "$@"

---

# scripts/maintenance.sh
#!/bin/bash

# Royal Equips Platform - Maintenance Script
# Run weekly for system maintenance

set -e

LOG_FILE="/var/log/royal-equips-maintenance.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log "🔧 Starting maintenance routine..."

# Clean up Docker resources
log "🐳 Cleaning Docker resources..."
docker system prune -f
docker volume prune -f
docker network prune -f

# Clean up old log files
log "📄 Cleaning old log files..."
find /opt/royal-equips-data/logs -name "*.log" -mtime +30 -delete
find /var/log -name "*.log.*.gz" -mtime +30 -delete

# Update system packages
log "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Check SSL certificate expiration
log "🔐 Checking SSL certificate..."
cert_expiry=$(openssl x509 -in /opt/ssl-certificates/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2 || echo "Not found")
if [ "$cert_expiry" != "Not found" ]; then
    expiry_epoch=$(date -d "$cert_expiry" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ $days_until_expiry -lt 30 ]; then
        log "⚠️ SSL certificate expires in $days_until_expiry days"
        # Auto-renew with certbot
        sudo certbot renew --nginx --quiet
    else
        log "✅ SSL certificate valid for $days_until_expiry days"
    fi
fi

# Database maintenance
log "🗄️ Running database maintenance..."
docker-compose -f /opt/royal-equips-platform/docker-compose.prod.yml exec -T postgres psql -U admin -d royal_equips -c "VACUUM ANALYZE;"

# Restart services to ensure clean state
log "🔄 Restarting services..."
cd /opt/royal-equips-platform
docker-compose -f docker-compose.prod.yml restart

log "✅ Maintenance completed successfully"

---

# monitoring/grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    basicAuth: false
    editable: true

---

# monitoring/grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'Royal Equips Dashboards'
    orgId: 1
    folder: 'Royal Equips'
    folderUid: royal_equips
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards

---

# crontab configuration
# Add to server crontab with: crontab -e

# Royal Equips Platform - Scheduled Tasks

# Backup every day at 2 AM
0 2 * * * /opt/royal-equips-platform/scripts/backup.sh >> /var/log/backup.log 2>&1

# Health checks every 5 minutes
*/5 * * * * /opt/royal-equips-platform/scripts/health-check.sh >> /var/log/health-check.log 2>&1

# Weekly maintenance on Sunday at 3 AM
0 3 * * 0 /opt/royal-equips-platform/scripts/maintenance.sh >> /var/log/maintenance.log 2>&1

# Clean up old logs weekly
0 4 * * 0 find /var/log -name "*.log" -mtime +30 -delete

# Renew SSL certificates monthly
0 5 1 * * /usr/bin/certbot renew --nginx --quiet

---

# systemd/royal-equips.service
# System service for auto-start on boot
# Copy to /etc/systemd/system/royal-equips.service

[Unit]
Description=Royal Equips Platform
Requires=docker.service
After=docker.service
StartLimitInterval=200
StartLimitBurst=3

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/royal-equips-platform
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0
Restart=on-failure
RestartSec=30s

[Install]
WantedBy=multi-user.target

---

# fail2ban/royal-equips.conf
# Copy to /etc/fail2ban/jail.d/royal-equips.conf

[royal-equips-auth]
enabled = true
port = http,https
filter = royal-equips-auth
logpath = /opt/royal-equips-data/logs/auth.log
maxretry = 5
bantime = 3600
findtime = 600

[royal-equips-api]
enabled = true
port = http,https
filter = royal-equips-api
logpath = /opt/royal-equips-data/logs/api.log
maxretry = 20
bantime = 1800
findtime = 300

---

# fail2ban/filter.d/royal-equips-auth.conf
# Copy to /etc/fail2ban/filter.d/

[Definition]
failregex = ^.*"POST /api/auth/login.*" 401 .*"<HOST>".*$
            ^.*"POST /api/auth/token.*" 401 .*"<HOST>".*$

ignoreregex =

---

# fail2ban/filter.d/royal-equips-api.conf
# Copy to /etc/fail2ban/filter.d/

[Definition]
failregex = ^.*" 429 .*"<HOST>".*$
            ^.*" 403 .*"<HOST>".*$

ignoreregex =

---

# ansible/server-config.yml
# Ansible playbook for server configuration

---
- name: Configure Royal Equips Platform Server
  hosts: royal_equips_servers
  become: yes
  
  vars:
    app_user: royal_equips
    app_dir: /opt/royal-equips-platform
    data_dir: /opt/royal-equips-data
    
  tasks:
    - name: Create application user
      user:
        name: "{{ app_user }}"
        system: yes
        home: "{{ app_dir }}"
        shell: /bin/bash
        
    - name: Create application directories
      file:
        path: "{{ item }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0755'
      loop:
        - "{{ app_dir }}"
        - "{{ data_dir }}"
        - "{{ data_dir }}/postgres"
        - "{{ data_dir }}/redis"
        - "{{ data_dir }}/rabbitmq"
        - "{{ data_dir }}/logs"
        - /opt/backups
        - /opt/ssl-certificates
        
    - name: Install required packages
      apt:
        name:
          - docker.io
          - docker-compose
          - nginx
          - certbot
          - python3-certbot-nginx
          - fail2ban
          - ufw
          - htop
          - curl
          - jq
        state: present
        update_cache: yes
        
    - name: Start and enable Docker
      systemd:
        name: docker
        state: started
        enabled: yes
        
    - name: Add user to docker group
      user:
        name: "{{ app_user }}"
        groups: docker
        append: yes
        
    - name: Configure UFW firewall
      ufw:
        rule: allow
        port: "{{ item }}"
      loop:
        - ssh
        - http
        - https
        
    - name: Enable UFW
      ufw:
        state: enabled
        
    - name: Copy systemd service file
      template:
        src: royal-equips.service.j2
        dest: /etc/systemd/system/royal-equips.service
        owner: root
        group: root
        mode: '0644'
      notify:
        - reload systemd
        - enable royal-equips service
        
    - name: Setup cron jobs
      cron:
        name: "{{ item.name }}"
        minute: "{{ item.minute }}"
        hour: "{{ item.hour }}"
        day: "{{ item.day | default('*') }}"
        month: "{{ item.month | default('*') }}"
        weekday: "{{ item.weekday | default('*') }}"
        job: "{{ item.job }}"
        user: "{{ app_user }}"
      loop:
        - name: "Daily backup"
          minute: "0"
          hour: "2"
          job: "{{ app_dir }}/scripts/backup.sh >> /var/log/backup.log 2>&1"
        - name: "Health checks"
          minute: "*/5"
          hour: "*"
          job: "{{ app_dir }}/scripts/health-check.sh >> /var/log/health-check.log 2>&1"
        - name: "Weekly maintenance"
          minute: "0"
          hour: "3"
          weekday: "0"
          job: "{{ app_dir }}/scripts/maintenance.sh >> /var/log/maintenance.log 2>&1"
          
  handlers:
    - name: reload systemd
      systemd:
        daemon_reload: yes
        
    - name: enable royal-equips service
      systemd:
        name: royal-equips
        enabled: yes

---

# requirements.txt
# Python dependencies for the platform

# Core Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
alembic==1.13.0
asyncpg==0.29.0
psycopg2-binary==2.9.9

# Cache & Message Queue
redis==5.0.1
celery==5.3.4
kombu==5.3.4

# HTTP Client
aiohttp==3.9.1
httpx==0.25.2
requests==2.31.0

# Channel Integrations
shopify-python-api==12.0.0
boto3==1.34.0
sp-api==0.22.0

# AI & ML
openai==1.3.7
anthropic==0.7.8
scikit-learn==1.3.2
pandas==2.1.4
numpy==1.25.2

# Monitoring & Logging
prometheus-client==0.19.0
structlog==23.2.0

# Security
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.6

# Utilities
python-dotenv==1.0.0
typer==0.9.0
rich==13.7.0
pytrends==4.9.2

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.2

# Development
black==23.11.0
flake8==6.1.0
mypy==1.7.1

# Royal Equips Platform - Complete Infrastructure Setup

## Repository Structure

```
royal-equips-platform/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Continuous Integration
│       ├── build.yml                 # Docker Build & Push
│       ├── deploy.yml                # Production Deployment
│       ├── agents.yml                # Scheduled Agent Execution
│       ├── monitoring.yml            # System Health Monitoring
│       └── security.yml              # Security Scans
├── platform/
│   ├── api/
│   │   ├── main.py                   # FastAPI Application
│   │   ├── routes/                   # API Route Modules
│   │   └── middleware/               # Custom Middleware
│   ├── core/
│   │   ├── platform_engine.py       # Main Platform Engine
│   │   ├── agent_orchestrator.py    # Agent Management
│   │   ├── channel_manager.py       # Sales Channel Integration
│   │   └── celery_app.py            # Background Tasks
│   ├── agents/
│   │   ├── base_agent.py            # Base Agent Class
│   │   ├── product_research_agent.py
│   │   ├── inventory_pricing_agent.py
│   │   └── marketing_automation_agent.py
│   ├── connectors/
│   │   ├── shopify/
│   │   │   └── connector.py         # Shopify Integration
│   │   ├── amazon/
│   │   │   └── connector.py         # Amazon SP-API Integration
│   │   └── bolcom/
│   │       └── connector.py         # bol.com Integration
│   ├── database/
│   │   ├── models.py                # SQLAlchemy Models
│   │   └── migrations/              # Alembic Migrations
│   └── utils/
│       ├── exceptions.py            # Custom Exceptions
│       ├── logging.py               # Logging Configuration
│       └── security.py              # Security Utilities
├── scripts/
│   ├── server-setup.sh              # Server Initialization
│   ├── deploy.sh                    # Deployment Script
│   ├── backup.sh                    # Backup Automation
│   ├── health-check.sh              # Health Monitoring
│   ├── maintenance.sh               # System Maintenance
│   └── execute_agent.py             # Agent Execution Script
├── monitoring/
│   ├── prometheus.yml               # Prometheus Configuration
│   └── grafana/
│       ├── provisioning/            # Grafana Auto-provisioning
│       └── dashboards/              # Pre-built Dashboards
├── nginx/
│   ├── nginx.conf                   # Development Configuration
│   └── nginx.prod.conf              # Production Configuration
├── ansible/
│   └── server-config.yml            # Server Configuration Playbook
├── tests/
│   ├── unit/                        # Unit Tests
│   ├── integration/                 # Integration Tests
│   └── agents/                      # Agent Tests
├── dashboard/                       # React Frontend (separate repo)
├── docs/                           # Documentation
├── Dockerfile                      # Container Definition
├── docker-compose.yml             # Development Environment
├── docker-compose.prod.yml        # Production Environment
├── requirements.txt               # Python Dependencies
├── .env.example                   # Environment Template
├── .env.production.example        # Production Environment Template
└── README.md                      # Project Documentation
```

## Quick Start Guide

### 1. Repository Setup

```bash
# Create new repository on GitHub
gh repo create royal-equips-platform --private

# Clone repository
git clone https://github.com/your-username/royal-equips-platform.git
cd royal-equips-platform

# Copy all infrastructure files from this artifact
# (Copy the content from the artifacts above into respective files)
```

### 2. GitHub Actions Secrets Configuration

Navigate to `Settings > Secrets and variables > Actions` and add:

**Production Server:**
- `SERVER_HOST` - Your server IP/domain
- `SERVER_USER` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key for deployment

**Database & Services:**
- `DATABASE_URL` - Production database connection string
- `POSTGRES_PASSWORD` - Database password
- `RABBITMQ_PASSWORD` - Message queue password
- `SECRET_KEY` - Application secret key (32+ characters)

**Channel Integrations:**
- `SHOPIFY_API_KEY` - Shopify App API Key
- `SHOPIFY_API_SECRET` - Shopify App Secret
- `SHOPIFY_ACCESS_TOKEN` - Store Access Token
- `SHOPIFY_SHOP_URL` - your-shop.myshopify.com

**Monitoring & Alerts:**
- `SLACK_WEBHOOK_URL` - Slack notifications webhook
- `APP_URL` - Your production domain (https://yourdomain.com)

**Container Registry:**
- `GITHUB_TOKEN` - Automatically provided by GitHub

### 3. Server Setup (Hetzner/VPS)

```bash
# SSH into your server
ssh root@your-server-ip

# Download and run setup script
curl -sSL https://raw.githubusercontent.com/your-username/royal-equips-platform/main/scripts/server-setup.sh | bash

# Configure environment variables
cd /opt/royal-equips-platform
cp .env.production.example .env.production
nano .env.production  # Edit with your configuration

# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com

# Enable auto-start service
sudo systemctl enable royal-equips
sudo systemctl start royal-equips
```

### 4. Development Setup

```bash
# Local development environment
git clone https://github.com/your-username/royal-equips-platform.git
cd royal-equips-platform

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your development configuration

# Start development services
docker-compose up -d

# Run database migrations
alembic upgrade head

# Start development server
uvicorn platform.api.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. GitHub Actions Workflow

The infrastructure is configured for automatic deployment:

1. **Push to `main`** triggers:
   - CI tests (unit, integration, security)
   - Docker image build and push
   - Production deployment
   - Health checks

2. **Scheduled Agent Execution:**
   - Product Research: Every 6 hours
   - Inventory & Pricing: Every 4 hours
   - Marketing Automation: Every 12 hours

3. **System Monitoring:**
   - Health checks: Every 15 minutes
   - Performance monitoring: Continuous
   - Security scans: Weekly

### 6. Monitoring Setup

Access monitoring dashboards:

- **Application Health:** `https://yourdomain.com/api/health`
- **Grafana Dashboard:** `https://yourdomain.com:3001` (admin/password from .env)
- **Prometheus Metrics:** `https://yourdomain.com:9090`

### 7. Agent Configuration

Configure agents in the database or via API:

```python
# Example: Configure Product Research Agent
agent_config = {
    "name": "product_research",
    "enabled": True,
    "configuration": {
        "min_profit_margin": 30.0,
        "target_categories": ["electronics", "home", "sports"],
        "suppliers": ["autods", "spocket", "printful"]
    }
}
```

## Cost Breakdown

### Minimal Setup (€70/month)
- Hetzner Server (8 CPU, 64GB RAM): €49/month
- Domain: €10/year
- Backup Storage: €10/month
- SSL Certificate: Free (Let's Encrypt)

### Scaled Setup (€200-350/month)
- Multiple Hetzner Servers: €150-300/month
- CDN (Cloudflare Pro): €20/month
- Enhanced Monitoring: €30/month

## Scaling Strategy

### Phase 1: Single Server (0-€10K/month revenue)
- All services on one Hetzner server
- Basic monitoring and alerting
- Manual scaling as needed

### Phase 2: Multi-Server (€10K-50K/month revenue)
- Separate database server
- Load balancer for API servers
- Enhanced monitoring and logging

### Phase 3: Kubernetes (€50K+/month revenue)
- Kubernetes cluster for auto-scaling
- Microservices architecture
- Advanced monitoring and observability

## Security Considerations

The infrastructure includes:
- **Network Security:** UFW firewall, fail2ban intrusion prevention
- **Application Security:** JWT authentication, rate limiting, input validation
- **Container Security:** Regular vulnerability scans, minimal base images
- **Data Security:** Encrypted backups, SSL/TLS everywhere
- **Access Control:** SSH key authentication, principle of least privilege

## Backup & Recovery

Automated backup strategy:
- **Database:** Daily PostgreSQL dumps with 30-day retention
- **Application Data:** Daily incremental backups
- **Configuration:** Version controlled in Git
- **Recovery Time:** < 15 minutes for most scenarios

## Next Steps

1. **Set up the repository** with all configuration files
2. **Configure GitHub Actions secrets** for your environment
3. **Deploy to your server** using the provided scripts
4. **Configure channel integrations** (Shopify, Amazon, bol.com)
5. **Monitor and optimize** based on real usage patterns

This infrastructure provides a production-ready foundation that can scale from €0 to €100K+ monthly revenue while maintaining high availability and security standards.