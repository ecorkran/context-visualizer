"""
Local development server for project-structure-viz.

Serves the static site and exposes a /api/refresh endpoint that re-invokes
the parser to update project JSON files without a full page reload.

Usage:
    python serve.py              # serve on port 8000
    python serve.py --port 3000  # serve on a custom port
"""

from __future__ import annotations

import argparse
import http.server
import json
import sys
from pathlib import Path


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static file handler with /api/refresh endpoint."""

    def do_POST(self) -> None:
        if self.path == "/api/refresh":
            self._handle_refresh()
        else:
            self.send_error(404, "Not Found")

    def _handle_refresh(self) -> None:
        """Re-parse all projects listed in projects/manifest.json."""
        manifest_path = Path("projects/manifest.json")

        if not manifest_path.exists():
            self._json_response(500, {"status": "error", "message": "projects/manifest.json not found"})
            return

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception as exc:
            self._json_response(500, {"status": "error", "message": f"Failed to read manifest: {exc}"})
            return

        # Optionally filter to a subset of projects specified in the POST body
        requested: list[str] | None = None
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            try:
                body = json.loads(self.rfile.read(content_length))
                requested = body.get("projects")
            except Exception:
                pass  # Ignore malformed body — refresh all

        entries = manifest.get("projects", [])
        if requested is not None:
            entries = [e for e in entries if e.get("key") in requested]

        parse_py = Path("parse.py").resolve()
        if not parse_py.exists():
            self._json_response(500, {"status": "error", "message": f"parse.py not found at {parse_py}"})
            return

        refreshed: list[str] = []
        errors: list[str] = []

        for entry in entries:
            key = entry.get("key", "")
            source_path = entry.get("sourcePath", "")

            if not source_path:
                errors.append(f"{key}: no sourcePath in manifest")
                continue

            import subprocess
            result = subprocess.run(
                [sys.executable, str(parse_py), source_path],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                errors.append(f"{key}: {result.stderr.strip() or 'parser returned non-zero exit'}")
            else:
                refreshed.append(key)

        if errors and not refreshed:
            self._json_response(500, {"status": "error", "message": "; ".join(errors)})
        elif errors:
            self._json_response(200, {"status": "ok", "projects": refreshed, "warnings": errors})
        else:
            self._json_response(200, {"status": "ok", "projects": refreshed})

    def _json_response(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt: str, *args) -> None:  # noqa: ANN002
        # Suppress noisy access logs for static assets; keep API logs
        if "/api/" in (args[0] if args else ""):
            super().log_message(fmt, *args)


def main() -> None:
    ap = argparse.ArgumentParser(description="Serve the project-structure-viz site locally.")
    ap.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    args = ap.parse_args()

    server = http.server.HTTPServer(("", args.port), Handler)
    print(f"Serving at http://localhost:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", flush=True)


if __name__ == "__main__":
    main()
