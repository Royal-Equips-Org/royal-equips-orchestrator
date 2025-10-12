# Multi-Webhook System Integration Guide

## 🎯 Production-Ready Webhook Endpoints

The Royal Equips Command Center now includes a complete multi-webhook system deployed on Cloudflare Pages Functions. This system handles GitHub organization webhooks, Shopify store webhooks, and internal command center events.

## 📡 Webhook Endpoints

### Base URL
Once deployed to Cloudflare Pages, your webhook URLs will be:
```
https://royal-equips-command-center.pages.dev/api/webhooks/
```

### Available Endpoints

#### 1. GitHub Organization Webhook
```
POST https://royal-equips-command-center.pages.dev/api/webhooks/github
```
- **Purpose**: Handle GitHub organization events (push, PR, issues, workflow runs, deployments)
- **Authentication**: X-Hub-Signature-256 header with SHA-256 HMAC
- **Required Headers**:
  - `X-Hub-Signature-256`: GitHub signature
  - `X-GitHub-Event`: Event type (push, pull_request, issues, etc.)
  - `X-GitHub-Delivery`: Delivery ID
  - `User-Agent`: Must start with "GitHub-Hookshot/"

#### 2. Shopify Store Webhook
```
POST https://royal-equips-command-center.pages.dev/api/webhooks/shopify
```
- **Purpose**: Handle Shopify store events (orders, products, customers, inventory)
- **Authentication**: X-Shopify-Hmac-Sha256 header with base64 HMAC
- **Required Headers**:
  - `X-Shopify-Hmac-Sha256`: Shopify HMAC signature
  - `X-Shopify-Topic`: Event topic (orders/create, products/update, etc.)
  - `X-Shopify-Shop-Domain`: Shop domain
  - `X-Shopify-Webhook-Id`: Webhook ID

#### 3. Command Center Internal Webhook
```
POST https://royal-equips-command-center.pages.dev/api/webhooks/command-center
```
- **Purpose**: Handle internal system events and cross-service communication
- **Authentication**: Bearer token in Authorization header
- **Required Headers**:
  - `Authorization`: Bearer {INTERNAL_API_SECRET}
  - `X-Event-Source`: Source service name

#### 4. Health Check Endpoint
```
GET https://royal-equips-command-center.pages.dev/api/webhooks/health
```
- **Purpose**: Monitor webhook system health and configuration status
- **Response**: JSON with system status, configured endpoints, and version info

## 🔧 Environment Configuration

### Required Cloudflare Pages Environment Variables

Set these in your Cloudflare Pages project settings:

#### Production Environment
```bash
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret_here
INTERNAL_API_SECRET=your_internal_api_secret_here
BACKEND_API_URL=https://your-backend-api.com/api
```

#### Optional Environment Variables
```bash
# For backend event forwarding (recommended)
BACKEND_API_URL=https://api.royalequips.com
INTERNAL_API_SECRET=secure_internal_secret_key
```

## 🚀 GitHub Organization Webhook Setup

### Step 1: Configure GitHub Organization Webhook

1. Go to your GitHub Organization settings
2. Navigate to "Webhooks" section
3. Click "Add webhook"
4. Configure the webhook:

**Payload URL:**
```
https://royal-equips-command-center.pages.dev/api/webhooks/github
```

**Content type:** `application/json`

**Secret:** Use the same value as your `GITHUB_WEBHOOK_SECRET` environment variable

**Events to subscribe to:**
- [x] Push events
- [x] Pull requests
- [x] Issues
- [x] Repository events
- [x] Workflow runs
- [x] Deployments
- [x] Deployment statuses
- [x] Let me select individual events (recommended)

**Active:** ✅ Enabled

### Step 2: Test GitHub Webhook

After configuration, GitHub will send a ping event. Check your webhook delivery status in GitHub settings.

## 🛍️ Shopify Store Webhook Setup

### Configure Shopify Webhooks

1. Go to your Shopify Admin
2. Navigate to Settings → Notifications
3. Scroll down to "Webhooks" section
4. Add webhooks for each event type:

**Webhook URLs:**
```
https://royal-equips-command-center.pages.dev/api/webhooks/shopify
```

**Format:** JSON

**Recommended Events:**
- Order creation: `orders/create`
- Order updates: `orders/updated`
- Order payment: `orders/paid`
- Product creation: `products/create`
- Product updates: `products/update`
- Customer creation: `customers/create`
- Inventory updates: `inventory_levels/update`

## 🔐 Security Features

### Signature Verification
- **GitHub**: SHA-256 HMAC with `X-Hub-Signature-256` header
- **Shopify**: SHA-256 HMAC with `X-Shopify-Hmac-Sha256` header (base64)
- **Internal**: Bearer token authentication

### Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### CORS Support
- Preflight OPTIONS requests handled
- Cross-origin requests allowed for monitoring

## 📊 Monitoring & Observability

### Structured Logging
All webhook events are logged with:
- Request ID for tracking
- Event details and processing time
- Error details for failed requests
- Performance metrics

### Health Monitoring
Check webhook system health:
```bash
curl https://royal-equips-command-center.pages.dev/api/webhooks/health
```

Response includes:
- Configuration status for each webhook type
- Backend integration status
- System version and environment info

## 🔄 Event Processing Flow

1. **Receive**: Webhook request received at Cloudflare Pages Function
2. **Authenticate**: Signature/HMAC verification
3. **Parse**: JSON payload extraction and validation
4. **Log**: Structured logging with request tracking
5. **Forward**: Event forwarded to backend services (if configured)
6. **Process**: Event-specific processing logic
7. **Respond**: Success/error response returned

## 🛠️ Backend Integration

### Event Forwarding
When configured, webhook events are automatically forwarded to your backend services:

**Endpoints Called:**
- GitHub events → `${BACKEND_API_URL}/api/webhooks/github`
- Shopify events → `${BACKEND_API_URL}/api/shopify/webhooks/processed`
- Internal events → `${BACKEND_API_URL}/api/empire/events`

**Request Format:**
```json
{
  "id": "unique-event-id",
  "type": "github|shopify|command-center",
  "source": "cloudflare-pages",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "headers": {
    "X-GitHub-Event": "push",
    "X-GitHub-Delivery": "12345"
  },
  "payload": { /* original webhook payload */ }
}
```

### Retry Logic
- 3 retry attempts with exponential backoff
- 10-second timeout per request
- Failed forwards logged but don't fail webhook

## 🚨 Error Handling

### Response Codes
- `200`: Success - webhook processed
- `400`: Bad Request - missing headers or invalid payload
- `401`: Unauthorized - invalid signature/authentication
- `500`: Internal Server Error - processing failure

### Error Responses
```json
{
  "error": "Error message",
  "requestId": "unique-request-id",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📈 Performance

### Response Times
- **GitHub**: Sub-2 second response (GitHub timeout: 10s)
- **Shopify**: Sub-5 second response (Shopify timeout: 5s)
- **Internal**: Sub-1 second response

### Rate Limiting
- Basic rate limiting via Cloudflare Pages
- Request tracking and monitoring
- Abuse protection via Cloudflare security

## 🎯 Final GitHub Organization Webhook URL

**Use this URL for your GitHub Organization webhook:**

```
https://royal-equips-command-center.pages.dev/api/webhooks/github
```

This URL is production-ready and will handle all GitHub organization events with proper signature verification, logging, and backend integration.

## ✅ Deployment Checklist

- [x] Webhook functions implemented and tested
- [x] TypeScript compilation verified
- [x] Build process includes functions in dist/
- [x] Cloudflare Pages deployment configuration updated
- [x] Environment variables documented
- [x] Security and signature verification implemented
- [x] Error handling and logging added
- [x] Backend integration with retry logic
- [x] Health monitoring endpoint available
- [x] Performance optimized for webhook requirements

## 🔗 Next Steps

1. Deploy the updated command center to Cloudflare Pages
2. Configure environment variables in Cloudflare Pages settings
3. Set up GitHub organization webhook with the provided URL
4. Configure Shopify webhooks for your store
5. Test webhook delivery and monitor health endpoint
6. Verify backend integration is working correctly

The webhook system is now production-ready and can handle real GitHub organization events and Shopify store events with enterprise-grade security and reliability.