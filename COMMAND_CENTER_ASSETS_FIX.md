# Command Center Assets Path Fix

## Issue
Asset requests to `/command-center/assets/*` were returning 404 errors because the `STATIC_DIR` variable in `app/routes/command_center.py` was pointing to the wrong directory.

### Root Cause
```python
# BEFORE (incorrect):
STATIC_DIR = Path(__file__).parent.parent / "static"
# This resolved to: /app/static (which doesn't exist)
```

The path was missing one level of `parent`, causing it to point to `app/static` instead of the project root `static/` directory where Flask serves static files from.

## Solution
Changed the path to include an additional `.parent` to reach the project root:

```python
# AFTER (correct):
STATIC_DIR = Path(__file__).parent.parent.parent / "static"
# This resolves to: /static (correct location)
```

## Changes Made
- **File**: `app/routes/command_center.py`
- **Line**: 24
- **Change**: Added one `.parent` to the path resolution

## Verification

### Path Alignment ✅
All three files now point to the same location:
- `app/__init__.py`: `Path(__file__).parent.parent / "static"` → `/static`
- `app/routes/main.py`: `Path(__file__).parent.parent.parent / "static"` → `/static`
- `app/routes/command_center.py`: `Path(__file__).parent.parent.parent / "static"` → `/static`

### Test Results ✅
All integration tests pass:
```
tests/integration/test_command_center.py::TestCommandCenterIntegration::test_full_command_center_workflow PASSED
tests/integration/test_command_center.py::TestCommandCenterIntegration::test_agent_trigger_functionality PASSED
tests/integration/test_command_center.py::TestCommandCenterIntegration::test_real_time_metrics_api PASSED
tests/integration/test_command_center.py::TestCommandCenterIntegration::test_empire_status_api PASSED
```

### Directory Structure ✅
- ✅ `/static/` exists with `styles.css`
- ✅ `/app/static/` does not exist (correct)
- ✅ All paths resolve to project root `/static`

## Impact
This minimal single-line change fixes 404 errors for all assets served through the `/command-center` route:
- `/command-center/assets/index.js` ✅
- `/command-center/assets/index.css` ✅
- Any other assets in `/static/assets/` ✅

Assets will now be correctly served from `/static/assets/` instead of attempting to serve from the non-existent `/app/static/assets/`.

## Deployment Notes
- No migration or special deployment steps required
- Change is backward compatible
- Fixes existing 404 errors in production logs
