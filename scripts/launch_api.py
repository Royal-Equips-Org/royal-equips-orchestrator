"""Resilient API launcher for Royal Equips Orchestrator.

This launcher attempts to load the ASGI app from multiple candidate locations,
providing fallback options if the primary app location changes or fails to load.
"""

import importlib
import os
import sys
from pathlib import Path
from typing import List

# Add repository root to Python path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))

CANDIDATES: List[str] = [
    os.getenv("API_APP_PATH", ""),              # explicit override if provided
    "scripts.run_orchestrator:app",             # full orchestrator app (preferred)
    "orchestrator.api:app",                     # minimal fallback API
    "orchestrator.core.api:app",
    "orchestrator.main:app",
    "orchestrator.app:app",
    "orchestrator.server:app",
]
CANDIDATES = [c for c in CANDIDATES if c]


def load_app(candidates: List[str]):
    """Load ASGI app from the first working candidate."""
    last_err = None
    for target in candidates:
        try:
            mod_path, attr = target.split(":")
            mod = importlib.import_module(mod_path)
            app = getattr(mod, attr)
            print(f"[launcher] Loaded ASGI app from {target}", flush=True)
            return app
        except Exception as e:
            print(f"[launcher] Failed {target}: {e}", flush=True)
            last_err = e
    raise RuntimeError(f"No ASGI app found. Last error: {last_err}")


if __name__ == "__main__":
    app = load_app(CANDIDATES)
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
