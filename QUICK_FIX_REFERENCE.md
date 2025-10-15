# Quick Fix Reference Card

## 🚨 Problems Solved

| Error | Fixed? | How |
|-------|--------|-----|
| "Working outside of request context" | ✅ Yes | Eventlet monkey patch in wsgi.py |
| "GitHub rate limit exceeded" (spam) | ✅ Yes | Throttled to once per 5 minutes |
| "Failed to collect agent metrics" | ✅ Yes | Null checks + graceful startup |
| "Unknown action: update_dependencies" | ✅ Yes | Added missing action handlers |
| "Using default encryption key" | ℹ️ Info | Expected when env var not set |

## 🔧 Quick Setup

### Minimal (Works immediately):
```bash
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
FLASK_ENV=production
PORT=10000
```

### Recommended (No warnings):
```bash
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
SECRET_ENCRYPTION_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
FLASK_ENV=production
PORT=10000
```

### With GitHub (Reduces rate limits):
```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO_OWNER=Royal-Equips-Org
GITHUB_REPO_NAME=royal-equips-orchestrator
```

## 📝 Where to Set Credentials

### Render:
Dashboard → Service → Environment → Add Variable

### Local:
Copy `.env.example` to `.env` and edit

### GitHub Actions:
Automatically available from repo secrets

## ✅ Verify Fixes Work

Run this to test all fixes:
```bash
python verify_fixes.py
```

Expected output:
```
Results: 5/5 tests passed
✓ ALL TESTS PASSED
```

## 📚 Full Documentation

- **CREDENTIALS_GUIDE.md** - Complete credential reference
- **PRODUCTION_ERRORS_FIXED.md** - Detailed fix explanations
- **DEPLOYMENT_TROUBLESHOOTING.md** - Deployment issues

## 🎯 One-Liner Fix Commands

Generate all needed keys:
```bash
echo "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')" >> .env
echo "SECRET_ENCRYPTION_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')" >> .env
```

Test everything works:
```bash
python verify_fixes.py && echo "✓ All fixes verified!"
```

Start application:
```bash
python wsgi.py
```

## ⚠️ Still Having Issues?

1. Check `CREDENTIALS_GUIDE.md` - Section "Troubleshooting"
2. Run `python verify_fixes.py` - See what's missing
3. Review logs for specific error messages
4. Ensure `eventlet` is installed: `pip install eventlet`

## 📊 What You Should See

### ✅ Good Logs:
```
✅ Sentry error monitoring initialized
🤖 Autonomous Empire initialization scheduled
🏰 Agent Orchestration System initialization started
Royal Equips Flask Orchestrator initialized successfully
```

### ⚠️ OK to Ignore (Once per worker):
```
{"level": "warn", "event": "secret_encryption_key_default", ...}
```

### ❌ Should NOT See:
```
RuntimeError: Working outside of request context
WARNING:app.services.github_service:GitHub rate limit exceeded [repeated]
ERROR:app.services.realtime_agent_monitor:Failed to collect agent metrics
WARNING:app.services.autonomous_empire_agent:Unknown action
```

---

**All fixes verified and production-ready!** 🚀
