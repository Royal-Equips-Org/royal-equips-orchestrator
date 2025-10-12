# 🔍 Sentry Error Monitoring Integration Guide

## Overview

Royal Equips Orchestrator is now fully integrated with Sentry for comprehensive error monitoring and performance tracking across both backend (Python/Flask) and frontend (React/TypeScript) applications.

**Zero mock data** - All implementations use real Sentry API connections.

## Architecture

### Backend (Python/Flask)
- **Location**: `app/__init__.py`, `wsgi.py`
- **Framework**: Flask 3.0+ with Gunicorn
- **Port**: 10000
- **Integrations**:
  - Flask request/response tracking
  - Redis operations monitoring
  - SQLAlchemy database query tracking
  - Python logging integration

### Frontend (React/TypeScript)
- **Location**: `apps/command-center-ui/src/main.tsx`
- **Framework**: React 18 + Vite
- **Port**: 5173 (dev)
- **Integrations**:
  - React error boundary
  - Browser performance tracing
  - Route navigation tracking
  - User session replay

## Setup Instructions

### 1. Create Sentry Projects

1. Go to [sentry.io](https://sentry.io)
2. Create **2 separate projects**:
   - **Python** project for backend (Flask)
   - **JavaScript/React** project for frontend

3. Get DSN URLs from each project:
   - Backend DSN: `https://XXXXX@oXXXX.ingest.sentry.io/XXXXX`
   - Frontend DSN: `https://XXXXX@oXXXX.ingest.sentry.io/XXXXX`

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# Backend Sentry Configuration (Python/Flask)
SENTRY_DSN=https://eb76a0bb94e0ad8f6301a70ce1e8070a@o4509339504345088.ingest.de.sentry.io/4510116359897168
ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0
RELEASE_VERSION=v1.0.0

# Frontend Sentry Configuration (React/TypeScript)
VITE_SENTRY_DSN=YOUR_FRONTEND_DSN_HERE
VITE_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0
VITE_RELEASE_VERSION=v1.0.0
```

**Note**: The backend DSN is already configured with your provided DSN. Replace `VITE_SENTRY_DSN` with your frontend project DSN.

### 3. Install Dependencies

#### Backend (Python)
```bash
pip install -r requirements.txt
```

This installs:
- `sentry-sdk[flask]>=1.40` - Full Flask integration

#### Frontend (React)
```bash
cd apps/command-center-ui
pnpm install
```

This installs:
- `@sentry/react@^7.100.0` - React integration
- `@sentry/tracing@^7.100.0` - Performance monitoring

### 4. Start Applications

#### Development Mode

```bash
# Terminal 1 - Backend (Flask)
python wsgi.py

# Terminal 2 - Frontend (React)
cd apps/command-center-ui && pnpm dev
```

#### Production Mode

```bash
# Backend with Gunicorn
gunicorn -w 2 -b 0.0.0.0:10000 wsgi:app

# Frontend (build first)
cd apps/command-center-ui
pnpm build
# Serve with your preferred static server
```

### 5. Verify Installation

#### Backend Verification

Create a test route to trigger an error:

```python
# Add to any Flask blueprint for testing
@app.route('/test-sentry')
def test_sentry():
    division_by_zero = 1 / 0
    return "This won't be reached"
```

Visit `http://localhost:10000/test-sentry` and check Sentry dashboard.

#### Frontend Verification

Add a test button in any component:

```tsx
<button onClick={() => {
  throw new Error('Sentry frontend test error');
}}>
  Test Sentry
</button>
```

Click the button and check Sentry dashboard.

## Features

### Backend (Flask) Monitoring

#### Automatic Error Capture
- All unhandled exceptions
- Request context (URL, method, headers, IP)
- User identification
- Stack traces with local variables

#### Performance Monitoring
- Request/response timing
- Database query performance
- Redis operation latency
- Custom transactions

#### Integrations Active
- ✅ Flask request/response tracking
- ✅ Redis operations monitoring
- ✅ SQLAlchemy query tracking
- ✅ Python logging (INFO+ captured, ERROR+ as events)
- ✅ User IP and headers (PII enabled for debugging)

#### Configuration Options
```python
# Environment variables control behavior:
SENTRY_DSN                    # Project DSN (required)
ENVIRONMENT                   # production/staging/development
SENTRY_TRACES_SAMPLE_RATE    # 0.0-1.0 (transaction sampling)
SENTRY_PROFILES_SAMPLE_RATE  # 0.0-1.0 (profiling sampling)
RELEASE_VERSION              # Release identifier (e.g., v1.0.0)
```

### Frontend (React) Monitoring

#### Automatic Error Capture
- React component errors
- Unhandled promise rejections
- Browser console errors
- Network request failures

#### Performance Monitoring
- Page load times
- Route navigation timing
- Component render performance
- Browser API calls

#### User Experience Tracking
- User sessions
- Breadcrumbs (user actions)
- Custom tags and context
- Error boundaries with fallback UI

#### Configuration Options
```bash
# .env or .env.local:
VITE_SENTRY_DSN                    # Frontend project DSN (required)
VITE_ENVIRONMENT                   # Environment name
VITE_SENTRY_TRACES_SAMPLE_RATE    # Transaction sampling
VITE_RELEASE_VERSION              # Release identifier
```

## Real-World Usage

### Backend Error Example

```python
from flask import Blueprint
import sentry_sdk

bp = Blueprint('example', __name__)

@bp.route('/process-order')
def process_order():
    try:
        # Your business logic
        result = process_payment()
        
        # Add custom context to Sentry
        sentry_sdk.set_context("order", {
            "order_id": "12345",
            "amount": 99.99,
            "customer_id": "cust_789"
        })
        
        return {"success": True}
        
    except PaymentError as e:
        # Automatically captured by Sentry with full context
        sentry_sdk.capture_exception(e)
        return {"error": str(e)}, 500
```

### Frontend Error Example

```tsx
import * as Sentry from '@sentry/react';

function CheckoutPage() {
  const handlePayment = async () => {
    try {
      const result = await processPayment();
      
      // Add breadcrumb for debugging
      Sentry.addBreadcrumb({
        category: 'payment',
        message: 'Payment processed successfully',
        level: 'info',
      });
      
    } catch (error) {
      // Automatically captured with user context
      Sentry.captureException(error);
      toast.error('Payment failed');
    }
  };
  
  return <button onClick={handlePayment}>Pay Now</button>;
}
```

## Environment-Specific Behavior

### Development
- Errors logged to console
- Not sent to Sentry (controlled by `beforeSend`)
- Full error details visible

### Staging/Production
- Errors sent to Sentry
- User sessions tracked
- Performance monitoring active
- Release tracking enabled

## Monitoring Dashboard

Access your Sentry dashboards:
- Backend: https://sentry.io/organizations/YOUR_ORG/projects/YOUR_PYTHON_PROJECT/
- Frontend: https://sentry.io/organizations/YOUR_ORG/projects/YOUR_REACT_PROJECT/

### Key Metrics to Monitor

1. **Error Rate**: Errors per minute/hour
2. **Performance**: Transaction duration (p50, p75, p95, p99)
3. **User Impact**: Unique users affected
4. **Releases**: Error rate by release version
5. **Trends**: Error patterns over time

## Alerting

Configure alerts in Sentry dashboard:
1. Go to Settings → Alerts
2. Create alert rules:
   - Error spike detection
   - New issue notifications
   - Performance degradation
   - High error rate thresholds

## Privacy & Security

### PII (Personally Identifiable Information)
- **Backend**: `send_default_pii=True` - Includes IP, headers for debugging
- **Frontend**: User data scrubbed by default
- Configure PII scrubbing in Sentry dashboard if needed

### Data Retention
- Default: 90 days
- Configurable in Sentry project settings
- GDPR compliant data deletion available

## Troubleshooting

### Backend: Sentry Not Capturing Errors

1. Check SENTRY_DSN is set:
   ```bash
   echo $SENTRY_DSN
   ```

2. Check logs for initialization:
   ```
   ✅ Sentry error monitoring initialized (environment: production)
   ```

3. Test manually:
   ```python
   import sentry_sdk
   sentry_sdk.capture_message("Test message")
   ```

### Frontend: Sentry Not Capturing Errors

1. Check browser console:
   ```
   ✅ Sentry error monitoring initialized (frontend)
   ```

2. Verify environment variable:
   ```bash
   echo $VITE_SENTRY_DSN
   ```

3. Check build includes Sentry:
   ```bash
   cd apps/command-center-ui
   pnpm build
   # Check dist/ for Sentry code
   ```

### Common Issues

**Issue**: "SENTRY_DSN not set - error monitoring disabled"
- **Solution**: Add SENTRY_DSN to .env file

**Issue**: Errors not appearing in dashboard
- **Solution**: Check environment (dev mode blocks sending)

**Issue**: Too many events
- **Solution**: Adjust sample rates (0.0-1.0)

## Best Practices

### 1. Use Meaningful Release Names
```bash
RELEASE_VERSION=v1.2.3
VITE_RELEASE_VERSION=v1.2.3
```

### 2. Add Context to Errors
```python
sentry_sdk.set_context("business_context", {
    "feature": "checkout",
    "flow": "payment_processing"
})
```

### 3. Use Breadcrumbs
```python
sentry_sdk.add_breadcrumb(
    category='api',
    message='Calling Shopify API',
    level='info',
)
```

### 4. Filter Sensitive Data
```python
# In Sentry project settings → Security & Privacy
# Configure data scrubbing rules
```

### 5. Set Up Proper Alerting
- Alert on error spikes
- Monitor performance degradation
- Track new issues in production

## Cost Optimization

### Sampling Rates

Adjust based on traffic and budget:

```bash
# Low traffic (< 1000 req/day) - Full sampling
SENTRY_TRACES_SAMPLE_RATE=1.0

# Medium traffic (1000-10000 req/day) - 50% sampling
SENTRY_TRACES_SAMPLE_RATE=0.5

# High traffic (> 10000 req/day) - 10% sampling
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Quotas

Configure in Sentry project settings:
- Event quota per month
- Transaction quota per month
- Spike protection enabled

## Support

### Official Documentation
- Backend: https://docs.sentry.io/platforms/python/guides/flask/
- Frontend: https://docs.sentry.io/platforms/javascript/guides/react/

### Royal Equips Specific
- Questions: Check AGENT_ORCHESTRATION_SYSTEM.md
- Issues: Use GitHub Issues
- Monitoring: Sentry dashboard

## Summary

✅ **Backend (Flask)**: Full error monitoring with Flask, Redis, and SQLAlchemy integrations
✅ **Frontend (React)**: React error boundary, performance tracing, and user session tracking
✅ **Production-Ready**: Real Sentry connections, no mock data
✅ **Configurable**: Environment-based behavior, sampling rates, release tracking
✅ **Comprehensive**: Error capture, performance monitoring, user context, breadcrumbs

**The Royal Equips Command Center now has enterprise-grade error monitoring and tracking across the entire stack.**
