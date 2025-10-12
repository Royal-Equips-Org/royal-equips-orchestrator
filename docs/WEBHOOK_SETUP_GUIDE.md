# GitHub Organization Webhooks Setup Guide

## 🎯 Overview

Deze gids laat zien hoe je GitHub organization webhooks configureert om te integreren met je Royal Equips Empire system via Cloudflare Workers.

## 🔧 Stap 1: Deploy Webhook Worker

Eerst deploy je de webhook worker naar Cloudflare:

```powershell
# Voer uit vanuit de root van je repository
./scripts/deploy-webhooks.ps1 -Environment production -SetSecrets -Domain "jouw-domein.com"
```

Dit script zal:
- ✅ Cloudflare authenticatie controleren
- ✅ Webhook secrets configureren
- ✅ Worker deployen naar Cloudflare
- ✅ Webhook URLs tonen

## 🏢 Stap 2: GitHub Organization Webhooks Configureren

### 2.1 Ga naar Organization Settings

1. Ga naar je GitHub organization: `https://github.com/Royal-Equips-Org`
2. Klik op **Settings** tab
3. Klik op **Webhooks** in de sidebar

### 2.2 Add Webhook

Klik op **Add webhook** en configureer:

#### Payload URL
```
https://jouw-domein.com/webhooks/github
```
*Of gebruik de workers.dev URL als je geen custom domein hebt:*
```
https://royal-equips-webhooks-prod.workers.dev/webhooks/github
```

#### Content Type
- Selecteer: `application/json`

#### Secret
- Vul het **GitHub webhook secret** in dat je hebt geconfigureerd tijdens deployment
- Dit wordt gebruikt voor signature verification

#### SSL Verification  
- ✅ Enable SSL verification (aanbevolen voor productie)

#### Events
Selecteer de events die je wilt ontvangen:

**Repository Events:**
- [x] Pushes
- [x] Pull requests  
- [x] Issues
- [x] Issue comments
- [x] Pull request reviews
- [x] Releases

**Organization Events:**
- [x] Repository creation/deletion
- [x] Team changes
- [x] Organization member changes

**Security Events:**
- [x] Security advisories
- [x] Dependabot alerts

#### Active
- ✅ Ensure webhook is **Active**

### 2.3 Test Webhook

Na het opslaan:

1. GitHub stuurt automatisch een ping event
2. Check de **Recent Deliveries** sectie
3. Controleer of je een ✅ groene checkmark ziet

## 🛍️ Stap 3: Shopify Webhooks Configureren (Optioneel)

Als je ook Shopify webhooks wilt configureren:

### 3.1 Via Shopify Admin

1. Ga naar je Shopify Admin
2. **Settings** → **Notifications**
3. Scroll naar **Webhooks** sectie

### 3.2 Add Webhook

Voor elke event type die je wilt tracken:

**Orders:**
- Event: `Order creation`, `Order payment`, `Order updated`, etc.
- Format: `JSON`  
- URL: `https://jouw-domein.com/webhooks/shopify`

**Products:**
- Event: `Product creation`, `Product update`
- Format: `JSON`
- URL: `https://jouw-domein.com/webhooks/shopify`

**Inventory:**
- Event: `Inventory item update`
- Format: `JSON`
- URL: `https://jouw-domein.com/webhooks/shopify`

## 🔍 Stap 4: Webhook Monitoring

### 4.1 Health Check

Test je webhook endpoint:

```bash
curl https://jouw-domein.com/health
```

Verwachte response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z", 
  "service": "royal-equips-webhooks"
}
```

### 4.2 Cloudflare Logs

Monitor webhook verwerking via Cloudflare Dashboard:

1. Ga naar **Workers & Pages**
2. Klik op je **royal-equips-webhooks-prod** worker
3. **Logs** tab voor real-time monitoring

### 4.3 Command Center Integration

Je webhooks data wordt automatisch verwerkt door:

- **Analytics Module**: Real-time metrics en KPIs
- **AIRA Module**: AI-powered insights uit GitHub/Shopify events  
- **Agent System**: Automatische workflows gebaseerd op events

## 🔐 Security Best Practices

### Signature Verification
- ✅ Alle webhooks worden geverifieerd met HMAC signatures
- ✅ Invalid signatures worden geweigerd met 401 status
- ✅ Timing-safe comparison voorkomt timing attacks

### Secret Management
- ✅ Secrets worden veilig opgeslagen in Cloudflare Workers
- ✅ Geen secrets in code of logs
- ✅ Rotatie van secrets via `wrangler secret put`

### Rate Limiting
- ✅ Cloudflare provides built-in DDoS protection
- ✅ Worker heeft error handling voor overload scenarios

## 🚀 Advanced Configuration

### Custom Routes

Als je custom routing wilt voor specifieke repositories:

```javascript
// In webhook-worker.js - aangepaste routing
if (payload.repository?.name === 'royal-equips-orchestrator') {
  // Special handling voor main orchestrator repo
  await env.PRIORITY_QUEUE?.send(analyticsData);
}
```

### Queue Processing

Voor high-volume events, configureer Cloudflare Queues:

```toml
# In wrangler-webhooks.toml
[[queues.producers]]
queue = "high-priority-events"
binding = "PRIORITY_QUEUE"
```

### Analytics Integration

Connect webhooks met je analytics stack:

```javascript
// Send to analytics service
await fetch('https://analytics.jouw-domein.com/events', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${env.ANALYTICS_API_KEY}` },
  body: JSON.stringify(analyticsData)
});
```

## 🎯 Testing Webhooks

### GitHub Test Events

Trigger test events om je setup te valideren:

1. **Push Event**: Maak een commit en push naar een repository
2. **Issue Event**: Open/close een issue in een repository  
3. **PR Event**: Open een pull request

### Shopify Test Events  

1. **Order Event**: Plaats een test order in je Shopify store
2. **Product Event**: Update een product in Shopify Admin
3. **Inventory Event**: Wijzig inventory levels

### Webhook Debugging

Als webhooks niet werken:

1. **Check Recent Deliveries** in GitHub webhook settings
2. **Check Response Status**: 200 = success, 4xx/5xx = error
3. **Check Cloudflare Logs** voor worker errors
4. **Verify Secrets** zijn correct geconfigureerd

## 📊 Expected Data Flow

```
GitHub Org Event → Webhook → Cloudflare Worker → Queue → Analytics → Command Center Dashboard
     ↓
Shopify Event → Webhook → Cloudflare Worker → Queue → Agent System → Automated Actions
```

Your Royal Equips Empire is now fully connected to receive real-time events from both GitHub and Shopify! 🏰✨