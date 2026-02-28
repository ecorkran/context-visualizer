"""Shared fixtures for pytest — includes live server for E2E tests."""

from __future__ import annotations

import http.server
import socket
import sys
import threading
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def live_server():
    """Start the real serve.py HTTP server and yield its base URL.

    Session-scoped so the server is shared across all E2E tests —
    avoids repeated startup cost and port churn.
    """
    sys.path.insert(0, str(PROJECT_ROOT))
    import serve

    port = _find_free_port()
    server = http.server.HTTPServer(("", port), serve.Handler)
    # Serve static files from project root (same as running `python serve.py`)
    serve.Handler.directory = str(PROJECT_ROOT)

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    yield f"http://localhost:{port}"

    server.shutdown()
