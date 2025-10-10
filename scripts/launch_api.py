"""Legacy ASGI launcher - DEPRECATED
Use wsgi:app for Flask deployment instead.

This file is kept for backward compatibility only.
"""

import sys
import os

def main():
    """Legacy launcher that redirects to Flask app."""
    print("DEPRECATED: Use 'python -m flask --app wsgi:app run' or 'gunicorn wsgi:app' instead")
    print("This legacy ASGI launcher is no longer supported.")
    print("The current application uses Flask (WSGI), not FastAPI (ASGI).")
    sys.exit(1)

if __name__ == "__main__":
    main()
