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
import os
import sys
from pathlib import Path


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static file handler with /api/refresh endpoint."""

    def do_POST(self) -> None:
        if self.path == "/api/refresh":
            self._handle_refresh()
        elif self.path == "/api/projects":
            self._handle_add_project()
        else:
            self.send_error(404, "Not Found")

    def do_GET(self) -> None:
        if self.path == "/api/projects":
            self._handle_list_projects()
        elif self.path == "/api/info":
            self._handle_info()
        elif self.path == "/api/refresh":
            self.send_error(405, "Method Not Allowed")
        else:
            super().do_GET()

    def do_DELETE(self) -> None:
        if self.path.startswith("/api/projects/"):
            key = self.path[len("/api/projects/"):]
            self._handle_remove_project(key)
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

    def _manifest_path(self) -> Path:
        return Path("projects/manifest.json")

    def _parse_py(self) -> Path:
        return Path("parse.py").resolve()

    def _read_manifest(self) -> tuple[dict | None, str | None]:
        """Read and return manifest dict, or (None, error_message) on failure."""
        mp = self._manifest_path()
        if not mp.exists():
            return None, "projects/manifest.json not found"
        try:
            return json.loads(mp.read_text(encoding="utf-8")), None
        except Exception as exc:
            return None, f"Failed to read manifest: {exc}"

    def _write_manifest(self, manifest: dict) -> None:
        mp = self._manifest_path()
        mp.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    def _handle_info(self) -> None:
        """GET /api/info — return suggested scan root derived from tracked project paths."""
        manifest, _ = self._read_manifest()
        source_paths: list[str] = []
        if manifest:
            source_paths = [
                p["sourcePath"] for p in manifest.get("projects", [])
                if p.get("sourcePath")
            ]

        if len(source_paths) >= 2:
            common = os.path.commonpath(source_paths)
            # commonpath may return a file-like prefix rather than a directory
            scan_root = common if Path(common).is_dir() else str(Path(common).parent)
        elif len(source_paths) == 1:
            scan_root = str(Path(source_paths[0]).parent)
        else:
            scan_root = str(Path.home())

        self._json_response(200, {"status": "ok", "scanRoot": scan_root})

    def _handle_list_projects(self) -> None:
        """GET /api/projects — return all manifest entries."""
        manifest, err = self._read_manifest()
        if err:
            self._json_response(500, {"status": "error", "message": err})
            return
        self._json_response(200, {"status": "ok", "projects": manifest.get("projects", [])})

    def _handle_add_project(self) -> None:
        """POST /api/projects — parse project at path and add to manifest."""
        import subprocess

        content_length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
        except Exception:
            self._json_response(400, {"status": "error", "message": "Invalid JSON body"})
            return

        path_str = body.get("path", "")
        if not path_str:
            self._json_response(400, {"status": "error", "message": "Missing required field: path"})
            return

        project_path = Path(path_str)
        if not project_path.exists():
            self._json_response(400, {"status": "error", "message": f"Path does not exist: {path_str}"})
            return

        # Validate project structure by importing find_user_dir from parse.py
        sys.path.insert(0, str(self._parse_py().parent))
        try:
            from parse import find_user_dir
            if find_user_dir(project_path) is None:
                self._json_response(
                    400,
                    {"status": "error", "message": f"No project-documents/user/ found in {path_str}"},
                )
                return
        except ImportError as exc:
            self._json_response(500, {"status": "error", "message": f"Cannot import parse.py: {exc}"})
            return

        parse_py = self._parse_py()
        projects_dir = str(self._manifest_path().parent)
        result = subprocess.run(
            [sys.executable, str(parse_py), str(project_path), "--projects-dir", projects_dir],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            self._json_response(
                500,
                {"status": "error", "message": f"Parser error: {result.stderr.strip() or 'non-zero exit'}"},
            )
            return

        # Return the updated manifest entry for this project
        key = project_path.resolve().name.lower().replace(" ", "-")
        manifest, err = self._read_manifest()
        if err:
            self._json_response(500, {"status": "error", "message": err})
            return

        entry = next((p for p in manifest.get("projects", []) if p.get("key") == key), None)
        self._json_response(200, {"status": "ok", "project": entry})

    def _handle_remove_project(self, key: str) -> None:
        """DELETE /api/projects/{key} — remove from manifest and delete JSON file."""
        manifest, err = self._read_manifest()
        if err:
            self._json_response(500, {"status": "error", "message": err})
            return

        projects = manifest.get("projects", [])
        entry = next((p for p in projects if p.get("key") == key), None)
        if entry is None:
            self._json_response(404, {"status": "error", "message": f"Project '{key}' not found"})
            return

        manifest["projects"] = [p for p in projects if p.get("key") != key]
        self._write_manifest(manifest)

        # Delete the JSON data file (derived artifact — ignore if already absent)
        json_file = self._manifest_path().parent / entry.get("file", "")
        if json_file.name and json_file.exists():
            json_file.unlink()

        self._json_response(200, {"status": "ok", "removed": key})

    def _json_response(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt: str, *args) -> None:  # noqa: ANN002
        # Suppress noisy access logs for static assets; keep API logs
        first = str(args[0]) if args else ""
        if "/api/" in first:
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
