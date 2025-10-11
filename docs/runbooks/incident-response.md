# 🚨 Royal Equips Empire - Incident Response Runbook

## 🎯 Purpose
This runbook provides step-by-step procedures for responding to incidents in the Royal Equips Empire autonomous system.

## 🚨 Incident Classification

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **🔥 P0 - Critical** | Empire down, revenue stopped | 5 minutes | Immediate |
| **⚠️ P1 - High** | Major agent failure, data loss | 15 minutes | 1 hour |
| **⚡ P2 - Medium** | Single agent down, performance degraded | 1 hour | 4 hours |
| **ℹ️ P3 - Low** | Minor issues, warnings | 4 hours | Next business day |

## 🔧 Emergency Procedures

### 🚨 P0 - Complete System Failure

**Symptoms:**
- API returning 5xx errors
- Command Center not accessible
- No agent responses
- Revenue streams stopped

**Immediate Actions (5 min):**
```bash
# 1. Emergency rollback
curl -X POST http://localhost:10000/api/empire/rollback \
  -H "Content-Type: application/json" \
  -d '{"type": "emergency", "reason": "P0 incident"}'

# 2. Check system status
curl http://localhost:10000/healthz
curl http://localhost:10000/readyz

# 3. Restart core services
pnpm start:api
```

**Investigation (15 min):**
```bash
# Check logs
docker logs royal-equips-api
tail -f logs/empire.log

# Check database connectivity
curl http://localhost:10000/api/status/database

# Check external service status
curl https://status.shopify.com/api/v1/status.json
```

**Recovery:**
1. Identify root cause
2. Apply targeted fix
3. Gradual system restart
4. Verify all agents operational
5. Resume autonomous operations

### ⚠️ P1 - Major Agent Failure

**Symptoms:**
- Critical agent (Orders, Payments) not responding
- Data corruption detected
- Security breach indicators

**Actions:**
```bash
# 1. Isolate affected agent
curl -X POST http://localhost:10000/api/agents/{agent-id}/disable

# 2. Check agent logs
curl http://localhost:10000/api/agents/{agent-id}/logs

# 3. Verify data integrity
curl http://localhost:10000/api/system/integrity-check

# 4. Manual failover if needed
curl -X POST http://localhost:10000/api/agents/{agent-id}/failover
```

### ⚡ P2 - Single Agent Issues

**Symptoms:**
- One non-critical agent failing
- Performance degradation
- Queue backlog

**Actions:**
```bash
# 1. Restart agent
curl -X POST http://localhost:10000/api/agents/{agent-id}/restart

# 2. Check resource usage
curl http://localhost:10000/api/system/resources

# 3. Clear queue if needed
curl -X POST http://localhost:10000/api/system/clear-queue
```

## 🔍 Investigation Toolkit

### Health Check Commands
```bash
# Overall system health
curl http://localhost:10000/healthz | jq

# Individual agent status
curl http://localhost:10000/api/agents | jq '.[] | {name, status, health}'

# System metrics
curl http://localhost:10000/metrics | jq

# Database connectivity
curl http://localhost:10000/api/status/database

# External API status
curl http://localhost:10000/api/status/external
```

### Log Analysis
```bash
# Real-time logs
tail -f logs/empire-$(date +%Y-%m-%d).log

# Agent-specific logs
grep "ProductResearchAgent" logs/*.log | tail -20

# Error patterns
grep -E "(ERROR|FATAL|EXCEPTION)" logs/*.log | tail -50

# Performance metrics
grep "execution_time" logs/*.log | awk '{print $NF}' | sort -n
```

### Resource Monitoring
```bash
# Memory usage
free -h
ps aux --sort=-%mem | head -10

# CPU usage
top -b -n1 | head -20

# Disk space
df -h
du -sh logs/ data/

# Network connectivity
ping -c 3 api.shopify.com
ping -c 3 supabase.co
```

## 🛠️ Recovery Procedures

### Database Recovery
```sql
-- Check for corrupted data
SELECT * FROM agents WHERE status = 'error';
SELECT * FROM executions WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour';

-- Restore from backup if needed
pg_restore -d royal_equips backup_$(date +%Y%m%d).sql
```

### Agent Recovery
```bash
# Reset agent state
curl -X POST http://localhost:10000/api/agents/{agent-id}/reset

# Reload agent configuration
curl -X POST http://localhost:10000/api/agents/{agent-id}/reload-config

# Run diagnostic
curl -X POST http://localhost:10000/api/agents/{agent-id}/diagnostic
```

### Data Synchronization
```bash
# Force sync with Shopify
curl -X POST http://localhost:10000/api/sync/shopify/force

# Sync with Supabase
curl -X POST http://localhost:10000/api/sync/supabase/force

# Rebuild analytics
curl -X POST http://localhost:10000/api/analytics/rebuild
```

## 📞 Escalation Procedures

### Contact List
- **On-call Engineer**: [Slack: @oncall-empire]
- **System Administrator**: [Email: admin@royalequips.com]
- **Business Owner**: [Phone: +31-XXX-XXXX]

### Communication Templates

#### P0 Incident Alert
```
🚨 P0 INCIDENT - Royal Equips Empire
Status: INVESTIGATING
Impact: Complete system outage
Started: [TIME]
ETA: Investigating

Actions taken:
- Emergency rollback initiated
- Root cause investigation in progress
- All hands on deck

Next update: 15 minutes
```

#### Resolution Notice
```
✅ RESOLVED - Royal Equips Empire
Duration: [X minutes]
Root cause: [Brief description]
Resolution: [Action taken]

All systems operational.
Post-mortem: [Link]
```

## 📊 Post-Incident Procedures

### 1. Create Post-Mortem Issue
```markdown
# Post-Mortem: [Incident Title]

## Timeline
- [HH:MM] Initial detection
- [HH:MM] Escalation to P0
- [HH:MM] Root cause identified
- [HH:MM] Fix applied
- [HH:MM] Resolution confirmed

## Root Cause
[Detailed explanation]

## Impact
- Revenue: €[amount] lost
- Duration: [X] minutes
- Customers affected: [number]

## Action Items
- [ ] Implement monitoring for [specific issue]
- [ ] Update runbook with lessons learned
- [ ] Schedule system improvement discussion
```

### 2. Update Monitoring
- Add alerts for the specific failure mode
- Improve health checks
- Update dashboard with new metrics

### 3. System Improvements
- Implement fixes to prevent recurrence
- Add automated recovery procedures
- Update documentation

## 🔄 Preventive Measures

### Daily Health Checks
```bash
#!/bin/bash
# Daily empire health check
echo "🏰 Royal Equips Empire Daily Health Check - $(date)"

# API Health
curl -f http://localhost:10000/healthz || echo "❌ API unhealthy"

# Agent Status
AGENTS_DOWN=$(curl -s http://localhost:10000/api/agents | jq '[.[] | select(.status != "active")] | length')
echo "📊 Agents down: $AGENTS_DOWN"

# Metrics Summary
curl -s http://localhost:10000/metrics | jq '.metrics'

echo "✅ Daily check complete"
```

### Weekly System Review
- Review incident trends
- Check system performance metrics  
- Update capacity planning
- Review and test backup procedures

### Monthly Empire Assessment
- Full system audit
- Security review
- Performance optimization
- Business continuity testing

---

**🤖 Remember**: The Royal Equips Empire is designed to be autonomous and self-healing. Most issues should resolve automatically. This runbook is for exceptional cases that require human intervention.

**📞 Emergency Contact**: If you can't resolve a P0 incident within 30 minutes, escalate immediately to the business owner.