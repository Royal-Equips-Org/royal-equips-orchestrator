# 🔄 Royal Equips Empire - Rollback Procedures

## 🎯 Purpose
This runbook provides comprehensive procedures for rolling back changes in the Royal Equips Empire autonomous system.

## 🚨 When to Rollback

### Immediate Rollback Triggers
- **🔥 System instability**: Error rates > 5%
- **💰 Revenue impact**: Transactions failing
- **🛡️ Security breach**: Unauthorized access detected  
- **📊 Data corruption**: Invalid data detected
- **🤖 Agent malfunction**: Critical agents not responding

### Rollback Decision Matrix

| Situation | Auto-Rollback | Manual Decision | Approval Required |
|-----------|---------------|-----------------|-------------------|
| API errors > 5% | ✅ Yes | ❌ No | ❌ No |
| Revenue drop > 10% | ✅ Yes | ❌ No | ❌ No |
| Data corruption | ❌ No | ✅ Yes | ✅ Yes |
| Agent failure (non-critical) | ❌ No | ✅ Yes | ❌ No |
| Security incident | ✅ Yes | ❌ No | ✅ Yes |

## 🔧 Rollback Types

### 1. 🚨 Emergency Rollback (Immediate)
Complete system rollback to last known good state.

```bash
# Via API
curl -X POST http://localhost:10000/api/empire/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "type": "emergency",
    "reason": "System instability",
    "rollback_to": "last_stable"
  }'

# Via Command Console
/rollback emergency
```

### 2. 🎯 Targeted Rollback (Specific Components)
Rollback specific agents or services.

```bash
# Rollback specific agent
curl -X POST http://localhost:10000/api/agents/{agent-id}/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "rollback_to": "2024-01-15T10:30:00Z",
    "reason": "Agent malfunction"
  }'

# Rollback specific deployment
curl -X POST http://localhost:10000/api/deployments/{deployment-id}/rollback
```

### 3. 📊 Data Rollback (Database/State)
Rollback data changes to a specific point in time.

```bash
# Database rollback
curl -X POST http://localhost:10000/api/data/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "target_time": "2024-01-15T10:00:00Z",
    "tables": ["products", "orders", "inventory"],
    "dry_run": true
  }'
```

## 🔄 Step-by-Step Procedures

### Emergency Rollback Procedure

#### Step 1: Assess Situation (2 minutes)
```bash
# Check current system status
curl http://localhost:10000/api/system/status | jq

# Check error rates
curl http://localhost:10000/api/metrics/errors | jq

# Check recent changes
curl http://localhost:10000/api/deployments/recent | jq
```

#### Step 2: Initiate Rollback (1 minute)
```bash
# Start emergency rollback
ROLLBACK_ID=$(curl -X POST http://localhost:10000/api/empire/rollback \
  -H "Content-Type: application/json" \
  -d '{"type": "emergency"}' | jq -r '.rollback_id')

echo "Rollback initiated: $ROLLBACK_ID"
```

#### Step 3: Monitor Progress (5 minutes)
```bash
# Check rollback status
while true; do
  STATUS=$(curl -s http://localhost:10000/api/rollbacks/$ROLLBACK_ID | jq -r '.status')
  echo "Rollback status: $STATUS"
  
  if [[ "$STATUS" == "completed" ]]; then
    echo "✅ Rollback completed successfully"
    break
  elif [[ "$STATUS" == "failed" ]]; then
    echo "❌ Rollback failed - manual intervention required"
    break
  fi
  
  sleep 10
done
```

#### Step 4: Verify System Health (3 minutes)
```bash
# Verify API health
curl -f http://localhost:10000/healthz || echo "❌ API still unhealthy"

# Check agent status
curl http://localhost:10000/api/agents | jq '.[] | {name, status, health}'

# Test critical functionality
curl -X POST http://localhost:10000/api/test/critical-path
```

### Targeted Agent Rollback

#### Product Research Agent Rollback
```bash
# Check agent history
curl http://localhost:10000/api/agents/product-research/history | jq

# Rollback to specific execution
curl -X POST http://localhost:10000/api/agents/product-research/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exec-123456",
    "reason": "Invalid products created"
  }'
```

#### Pricing Agent Rollback
```bash
# Rollback pricing changes
curl -X POST http://localhost:10000/api/agents/pricing/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "rollback_hours": 2,
    "reason": "Incorrect price calculations"
  }'

# Verify price restoration
curl http://localhost:10000/api/products/prices/verify
```

### Database Rollback Procedures

#### Point-in-Time Recovery
```bash
# 1. Create backup of current state
curl -X POST http://localhost:10000/api/database/backup \
  -d '{"name": "pre_rollback_$(date +%Y%m%d_%H%M%S)"}'

# 2. Perform point-in-time recovery
curl -X POST http://localhost:10000/api/database/restore \
  -H "Content-Type: application/json" \
  -d '{
    "target_time": "2024-01-15T10:00:00Z",
    "verify_integrity": true
  }'

# 3. Verify data consistency
curl http://localhost:10000/api/database/integrity-check
```

#### Selective Table Rollback
```sql
-- Connect to database
psql $DATABASE_URL

-- Rollback specific tables (example)
BEGIN;

-- Backup current data
CREATE TABLE products_backup AS SELECT * FROM products;
CREATE TABLE orders_backup AS SELECT * FROM orders;

-- Restore from backup
DELETE FROM products WHERE updated_at > '2024-01-15 10:00:00';
DELETE FROM orders WHERE created_at > '2024-01-15 10:00:00';

-- Restore from point-in-time backup
INSERT INTO products SELECT * FROM products_pit_backup;
INSERT INTO orders SELECT * FROM orders_pit_backup;

-- Verify data
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;

COMMIT;
```

## 🔍 Rollback Verification

### System Health Verification
```bash
#!/bin/bash
echo "🔍 Post-Rollback Verification"

# 1. API Health
echo "Checking API health..."
curl -f http://localhost:10000/healthz && echo "✅ API healthy" || echo "❌ API unhealthy"

# 2. Agent Status
echo "Checking agent status..."
UNHEALTHY_AGENTS=$(curl -s http://localhost:10000/api/agents | jq '[.[] | select(.health != "healthy")] | length')
echo "Unhealthy agents: $UNHEALTHY_AGENTS"

# 3. Database Connectivity
echo "Checking database..."
curl -f http://localhost:10000/api/database/health && echo "✅ Database connected" || echo "❌ Database issues"

# 4. External Services
echo "Checking Shopify connection..."
curl -f http://localhost:10000/api/shopify/health && echo "✅ Shopify connected" || echo "❌ Shopify issues"

# 5. Key Metrics
echo "Checking key metrics..."
ERROR_RATE=$(curl -s http://localhost:10000/api/metrics | jq '.error_rate')
echo "Current error rate: $ERROR_RATE%"

if (( $(echo "$ERROR_RATE < 1" | bc -l) )); then
    echo "✅ System verification passed"
else
    echo "❌ System verification failed - error rate too high"
fi
```

### Business Function Tests
```bash
# Test critical business functions
echo "🧪 Testing critical business functions..."

# 1. Test product creation
PRODUCT_TEST=$(curl -s -X POST http://localhost:10000/api/test/create-product \
  -d '{"name": "Test Product", "price": 19.99}')
echo "Product creation test: $PRODUCT_TEST"

# 2. Test order processing  
ORDER_TEST=$(curl -s -X POST http://localhost:10000/api/test/process-order \
  -d '{"product_id": "test-123", "quantity": 1}')
echo "Order processing test: $ORDER_TEST"

# 3. Test pricing calculation
PRICING_TEST=$(curl -s http://localhost:10000/api/test/calculate-pricing \
  -d '{"product_id": "test-123"}')
echo "Pricing calculation test: $PRICING_TEST"
```

## 📊 Rollback Reporting

### Generate Rollback Report
```bash
#!/bin/bash
ROLLBACK_ID=$1
REPORT_FILE="rollback_report_$(date +%Y%m%d_%H%M%S).md"

cat > $REPORT_FILE << EOF
# Rollback Report - $ROLLBACK_ID

## Summary
- **Rollback ID**: $ROLLBACK_ID
- **Initiated**: $(date)
- **Type**: Emergency
- **Reason**: System instability

## Timeline
- $(date '+%H:%M:%S') - Rollback initiated
- $(date '+%H:%M:%S') - Services stopped
- $(date '+%H:%M:%S') - Database restored
- $(date '+%H:%M:%S') - Services restarted
- $(date '+%H:%M:%S') - Verification completed

## Impact Assessment
- **Duration**: X minutes
- **Revenue Impact**: €X lost
- **Orders Affected**: X orders
- **Data Loss**: None

## Verification Results
- ✅ API Health: Passed
- ✅ Agent Status: All healthy
- ✅ Database: Restored successfully
- ✅ External Services: Connected
- ✅ Business Functions: Working

## Next Steps
- [ ] Root cause analysis
- [ ] Update monitoring
- [ ] Process improvements
- [ ] Documentation updates

EOF

echo "Report generated: $REPORT_FILE"
```

## 🔄 Recovery After Rollback

### Gradual Recovery Process
1. **Verify System Stability** (15 minutes)
2. **Enable Non-Critical Agents** (10 minutes)
3. **Monitor for Issues** (30 minutes)
4. **Enable Critical Agents** (15 minutes)
5. **Full Operations Resume** (10 minutes)

### Recovery Commands
```bash
# 1. Enable agents gradually
curl -X POST http://localhost:10000/api/agents/observer/enable
sleep 300  # Wait 5 minutes

curl -X POST http://localhost:10000/api/agents/inventory/enable
sleep 300

curl -X POST http://localhost:10000/api/agents/pricing/enable
sleep 300

curl -X POST http://localhost:10000/api/agents/orders/enable
sleep 300

curl -X POST http://localhost:10000/api/agents/product-research/enable

# 2. Verify each step
curl http://localhost:10000/api/agents | jq '.[] | {name, status}'
```

## 🚨 Rollback Troubleshooting

### Common Issues

#### Rollback Stuck/Failed
```bash
# Check rollback logs
curl http://localhost:10000/api/rollbacks/$ROLLBACK_ID/logs

# Force complete rollback
curl -X POST http://localhost:10000/api/rollbacks/$ROLLBACK_ID/force-complete

# Manual cleanup if needed
curl -X POST http://localhost:10000/api/system/cleanup
```

#### Database Restore Issues  
```bash
# Check database status
curl http://localhost:10000/api/database/status

# Manual database recovery
psql $DATABASE_URL -c "SELECT pg_is_in_recovery();"

# Restart database connection pool
curl -X POST http://localhost:10000/api/database/restart-pool
```

#### Agent Recovery Issues
```bash
# Reset all agent states
curl -X POST http://localhost:10000/api/agents/reset-all

# Reload agent configurations  
curl -X POST http://localhost:10000/api/agents/reload-configs

# Restart agent orchestrator
curl -X POST http://localhost:10000/api/orchestrator/restart
```

---

**⚠️ Important**: Always verify system health after rollback completion. Never assume rollback was successful without proper verification.

**🤖 Automation**: Most rollbacks should be automated based on system metrics. Manual rollbacks are for exceptional cases.