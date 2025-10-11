# 🏆 Royal Equips Command Center - Access Guide

## Overview

The Royal Equips Command Center is your futuristic multi-billion dollar command and control interface for managing the entire e-commerce empire. This comprehensive guide provides instructions for accessing and utilizing all command center features.

## 🌐 Access URLs

### Primary Command Center
```
https://your-domain.com/command-center/
```

### API Endpoints
```
Base URL: https://your-domain.com/command-center/api/
```

## 🔑 Authentication & Setup

### 1. Environment Variables
Ensure these environment variables are configured in your deployment:

```env
# Core Application
FLASK_ENV=production
SECRET_KEY=your-secret-key

# Database & Storage
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# E-commerce Integrations
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_ACCESS_TOKEN=your-access-token
SHOPIFY_SHOP_URL=your-shop.myshopify.com

# AI & Analytics
OPENAI_API_KEY=your-openai-api-key
BIGQUERY_CREDENTIALS=your-bigquery-service-account-json

# Monitoring & Alerting
DATADOG_API_KEY=your-datadog-api-key
SENTRY_DSN=your-sentry-dsn
DISCORD_WEBHOOK_URL=your-discord-webhook-url

# AWS Infrastructure
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

### 2. GitHub Secrets
Configure these secrets in your GitHub repository:

```
Settings > Secrets and variables > Actions > Repository secrets
```

**Required Secrets:**
- `OPENAI_API_KEY` - For AI-powered analysis
- `SHOPIFY_API_KEY` - Shopify store integration
- `SHOPIFY_ACCESS_TOKEN` - Shopify API access
- `DATABASE_URL` - Database connection
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `BIGQUERY_CREDENTIALS` - Google BigQuery service account
- `DATADOG_API_KEY` - DataDog monitoring
- `SENTRY_DSN` - Sentry error tracking
- `DISCORD_WEBHOOK_URL` - Discord notifications

## 📊 Command Center Features

### 1. Empire Dashboard
Access the main dashboard to view:
- Real-time empire health and status
- Business performance metrics
- Revenue and order tracking
- Market intelligence insights
- Agent performance monitoring

**URL:** `/command-center/`

### 2. Real-time Metrics API
Get live business metrics:

```bash
curl -X GET "https://your-domain.com/command-center/api/metrics/real-time"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "today": 45230.50,
      "yesterday": 42180.30,
      "growth_rate": 7.2
    },
    "orders": {
      "total_today": 1247,
      "average_value": "$36.30",
      "conversion_rate": 3.8
    }
  }
}
```

### 3. Agent Management
Monitor and control autonomous agents:

```bash
# Get agent status
curl -X GET "https://your-domain.com/command-center/api/agents/status"

# Trigger specific agent
curl -X POST "https://your-domain.com/command-center/api/agents/product_research/trigger"
```

### 4. Market Intelligence
Access market analysis and opportunities:

```bash
curl -X GET "https://your-domain.com/command-center/api/market-intelligence"
```

### 5. Integration Status
Monitor all external service integrations:

```bash
curl -X GET "https://your-domain.com/command-center/api/integrations/status"
```

## 🔄 Real-time Data Streaming

### Server-Sent Events (SSE)
Connect to real-time metrics stream:

```javascript
const eventSource = new EventSource('/command-center/api/stream/metrics');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Real-time metrics:', data);
    
    // Update dashboard with new data
    updateDashboard(data.metrics);
};
```

### WebSocket Connection
For real-time bidirectional communication:

```javascript
const socket = io('/command-center');

socket.on('connect', function() {
    console.log('Connected to Command Center');
});

socket.on('metrics_update', function(data) {
    console.log('Metrics update:', data);
});

// Trigger agent remotely
socket.emit('trigger_agent', {agent: 'product_research'});
```

## 🚀 Autonomous Empire Analysis

### Automated Analysis Schedule
The system runs comprehensive analysis every 8 hours:
- **Market Analysis** - Trend detection and opportunity identification
- **Technology Stack** - Dependency updates and security patches
- **Security Audit** - Vulnerability scanning and compliance checks
- **Performance Review** - System optimization recommendations

### Manual Trigger
Trigger analysis manually via GitHub Actions:

1. Go to your repository's Actions tab
2. Select "🏆 Empire Autonomous Analysis & Upgrade System"
3. Click "Run workflow"
4. Choose analysis type:
   - `full` - Complete system analysis
   - `market` - Market intelligence only
   - `tech` - Technology stack review
   - `security` - Security audit only

## 📱 Mobile Access

The command center is fully responsive and optimized for mobile access:

- **Smartphone** - Full dashboard functionality
- **Tablet** - Enhanced dashboard with additional metrics
- **Desktop** - Complete feature set with real-time streaming

## 🛠️ Development Setup

### Local Development
1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   npm install
   ```
3. Set up environment variables in `.env`
4. Run the application:
   ```bash
   flask run --host=0.0.0.0 --port=5000
   ```
5. Access at `http://localhost:5000/command-center/`

### Docker Development
```bash
docker-compose up -d
```
Access at `http://localhost:10000/command-center/`

## 🔍 Monitoring & Alerts

### Health Checks
Monitor system health:
```bash
curl -X GET "https://your-domain.com/command-center/health"
```

### Alert Endpoints
Get active system alerts:
```bash
curl -X GET "https://your-domain.com/command-center/api/empire-alerts"
```

### Crisis Management
Access crisis status and failover information:
```bash
curl -X GET "https://your-domain.com/command-center/api/crisis/status"
```

## 📈 Performance Metrics

### Available Metrics
- **System Performance** - CPU, memory, disk usage
- **Application Metrics** - Response times, throughput, error rates
- **Business Metrics** - Revenue, orders, conversion rates
- **Database Performance** - Query performance, connection pools
- **Integration Health** - API status, rate limits, response times

### Accessing Metrics
```bash
curl -X GET "https://your-domain.com/command-center/api/performance/metrics"
```

## 🔧 Troubleshooting

### Common Issues

1. **Command Center Not Loading**
   - Check that the Flask application is running
   - Verify environment variables are set correctly
   - Check logs for error messages

2. **Real-time Data Not Updating**
   - Ensure WebSocket/SSE connections are enabled
   - Check firewall settings for WebSocket traffic
   - Verify background monitoring threads are running

3. **Agent Triggers Not Working**
   - Confirm agent implementations exist
   - Check agent configuration and permissions
   - Review agent logs for errors

4. **Integration Status Shows Disconnected**
   - Verify API keys and credentials
   - Check network connectivity to external services
   - Review rate limits and quotas

### Debug Mode
Enable debug logging:
```bash
export FLASK_ENV=development
export FLASK_DEBUG=1
```

## 🛡️ Security Considerations

### Access Control
- Implement authentication middleware for production
- Use HTTPS for all communications
- Secure WebSocket connections with proper authentication
- Rotate API keys and credentials regularly

### Rate Limiting
API endpoints are protected with rate limiting:
- Real-time metrics: 60 requests/minute
- Agent triggers: 10 requests/minute
- General endpoints: 100 requests/minute

## 📞 Support

For technical support or questions about the Command Center:

1. **Documentation** - Check this guide and API documentation
2. **Logs** - Review application logs for error details
3. **Health Endpoints** - Use health check endpoints for diagnostics
4. **GitHub Issues** - Create issues for bugs or feature requests

## 🚀 Next Steps

After setting up the Command Center:

1. **Configure Monitoring** - Set up DataDog dashboards and Sentry error tracking
2. **Customize Dashboards** - Modify the React frontend for your specific needs
3. **Add Custom Agents** - Implement additional autonomous agents
4. **Scale Infrastructure** - Configure load balancing and high availability
5. **Enhance Security** - Implement comprehensive authentication and authorization

---

**The Royal Equips Command Center puts the power of a multi-billion dollar e-commerce empire at your fingertips. Monitor, control, and scale your operations with confidence.** 🏆