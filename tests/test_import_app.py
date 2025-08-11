"""Test that the API main module imports successfully."""

import sys
from pathlib import Path

# Add the repository root to the Python path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))


def test_import_api_main():
    """Test that api.main imports successfully."""
    try:
        import api.main
        assert hasattr(api.main, 'app'), "api.main should have an 'app' attribute"
        assert api.main.app is not None, "api.main.app should not be None"
    except ImportError as e:
        raise AssertionError(f"Failed to import api.main: {e}")


def test_app_is_fastapi_instance():
    """Test that the app is a FastAPI instance."""
    import api.main
    from fastapi import FastAPI
    
    assert isinstance(api.main.app, FastAPI), "api.main.app should be a FastAPI instance"


if __name__ == "__main__":
    # Allow running this test directly
    test_import_api_main()
    test_app_is_fastapi_instance()
    print("✅ All import tests passed!")