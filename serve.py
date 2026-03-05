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
import logging
import os
import sys
from pathlib import Path

from mcp_client import McpClient

logger = logging.getLogger(__name__)

# Module-level MCP client instance; None when operating in local-only mode.
_mcp_client: McpClient | None = None

# Config flag: whether the future work collector is enabled (MCP-only feature).
_enable_future_work_collector: bool = False


def _load_mcp_config() -> dict | None:
    """Read mcp-config.json from the working directory.

    Returns the parsed config dict on success, or None if the file is absent
    or invalid (logs a warning on invalid JSON).
    """
    config_path = Path("mcp-config.json")
    if not config_path.exists():
        return None
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("mcp-config.json is present but could not be parsed: %s", exc)
        return None


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
        elif self.path.startswith("/api/discover"):
            self._handle_discover()
        elif self.path == "/api/structures":
            self._handle_structures()
        elif self.path.startswith("/api/future-work"):
            self._handle_future_work()
        elif self.path == "/api/status":
            self._handle_status()
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
        """Re-fetch project data for all (or a subset of) tracked projects.

        MCP mode: calls project_structure for each project via the MCP client.
        Local mode: re-runs parse.py for each project in the manifest.
        """
        # Parse optional body to get a requested subset of project keys
        requested: list[str] | None = None
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            try:
                body = json.loads(self.rfile.read(content_length))
                requested = body.get("projects")
            except Exception:
                pass  # Ignore malformed body — refresh all

        client = _mcp_client
        if client is not None and client.connected:
            self._handle_refresh_mcp(client, requested)
        else:
            self._handle_refresh_local(requested)

    def _handle_refresh_mcp(self, client: McpClient, requested: list[str] | None) -> None:
        """Refresh via MCP: re-fetch project_structure for each project."""
        try:
            project_list_result = client.call_tool("project_list", {})
            all_projects = project_list_result.get("projects", [])
        except Exception as exc:
            self._json_response(500, {"status": "error", "message": f"MCP project_list failed: {exc}"})
            return

        # Filter to requested subset if specified
        if requested is not None:
            all_projects = [
                p for p in all_projects
                if p.get("name", "").lower().replace(" ", "-") in requested
            ]

        refreshed: list[str] = []
        errors: list[str] = []

        for proj in all_projects:
            proj_id = proj.get("id", "")
            key = proj.get("name", proj_id).lower().replace(" ", "-")
            try:
                client.call_tool("project_structure", {"projectId": proj_id})
                refreshed.append(key)
            except Exception as exc:
                errors.append(f"{key}: {exc}")

        if errors and not refreshed:
            self._json_response(500, {"status": "error", "message": "; ".join(errors)})
        elif errors:
            self._json_response(200, {"status": "ok", "projects": refreshed, "warnings": errors})
        else:
            self._json_response(200, {"status": "ok", "projects": refreshed})

    def _handle_refresh_local(self, requested: list[str] | None) -> None:
        """Refresh via local parse.py for each project in the manifest."""
        manifest_path = Path("projects/manifest.json")

        if not manifest_path.exists():
            self._json_response(500, {"status": "error", "message": "projects/manifest.json not found"})
            return

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception as exc:
            self._json_response(500, {"status": "error", "message": f"Failed to read manifest: {exc}"})
            return

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
            # commonpath of directory paths is the shared parent; if it equals
            # one of the source paths exactly, go one level higher
            scan_root = str(Path(common).parent) if common in source_paths else common
        elif len(source_paths) == 1:
            scan_root = str(Path(source_paths[0]).parent)
        else:
            scan_root = str(Path.home())

        self._json_response(200, {"status": "ok", "scanRoot": scan_root})

    def _handle_discover(self) -> None:
        """GET /api/discover?root=<path> — scan immediate children for valid projects."""
        from urllib.parse import parse_qs, urlparse

        qs = parse_qs(urlparse(self.path).query)
        root = qs.get("root", [None])[0]

        if root is None:
            self._json_response(400, {"status": "error", "message": "Missing required parameter: root"})
            return
        root_path = Path(root)
        if not root_path.exists():
            self._json_response(400, {"status": "error", "message": f"Path does not exist: {root}"})
            return
        if not root_path.is_dir():
            self._json_response(400, {"status": "error", "message": f"Not a directory: {root}"})
            return

        sys.path.insert(0, str(self._parse_py().parent))
        try:
            from parse import build_model, find_user_dir
        except ImportError as exc:
            self._json_response(500, {"status": "error", "message": f"Cannot import parse.py: {exc}"})
            return

        candidates: list[dict] = []
        for child in root_path.iterdir():
            if not child.is_dir():
                continue
            user_dir = find_user_dir(child)
            if user_dir is None:
                continue
            try:
                display_name = build_model(user_dir).get("name", child.name)
            except Exception:
                display_name = child.name
            candidates.append({"path": str(child), "displayName": display_name})

        candidates.sort(key=lambda c: c["displayName"])
        self._json_response(200, {"status": "ok", "candidates": candidates[:30]})

    def _handle_structures(self) -> None:
        """GET /api/structures — return all project structure models.

        MCP path: calls project_list + project_structure for each project.
        Local path: returns 503 telling the frontend to use manifest+JSON fallback.
        """
        client = _mcp_client
        if client is None or not client.connected:
            self._json_response(503, {
                "status": "error",
                "mode": "local",
                "message": "MCP not connected",
            })
            return

        try:
            # 1. Enumerate projects
            project_list_result = client.call_tool("project_list", {})
            projects_raw = project_list_result.get("projects", [])

            # 2. Fetch structure for each project
            structures: dict = {}
            for proj in projects_raw:
                proj_id = proj.get("id", "")
                proj_name = proj.get("name", proj_id)
                proj_path = proj.get("projectPath", "")

                model = client.call_tool("project_structure", {"projectId": proj_id})

                # Skip projects where the MCP server returned an error envelope
                if model.get("isError"):
                    logger.debug("project_structure returned error for %s — skipping", proj_name)
                    continue

                # Derive key: lowercase, spaces → hyphens
                key = proj_name.lower().replace(" ", "-")
                model["sourcePath"] = proj_path
                structures[key] = model

            self._json_response(200, {
                "status": "ok",
                "mode": "mcp",
                "projects": structures,
            })

        except Exception as exc:
            logger.warning("MCP /api/structures failed: %s", exc)
            self._json_response(503, {
                "status": "error",
                "mode": "mcp",
                "message": str(exc),
            })

    def _handle_future_work(self) -> None:
        """GET /api/future-work?project=<id> — proxy workflow_future MCP tool."""
        client = _mcp_client
        if not _enable_future_work_collector or client is None or not client.connected:
            self._json_response(503, {
                "status": "error",
                "message": "Future work collector is not available",
            })
            return

        from urllib.parse import parse_qs, urlparse
        qs = parse_qs(urlparse(self.path).query)
        project_id = qs.get("project", [None])[0]

        params: dict = {"status": "all"}
        if project_id:
            params["projectId"] = project_id

        try:
            result = client.call_tool("workflow_future", params)
            self._json_response(200, {"status": "ok", "data": result})
        except Exception as exc:
            logger.warning("workflow_future failed: %s", exc)
            self._json_response(500, {
                "status": "error",
                "message": str(exc),
            })

    def _handle_status(self) -> None:
        """GET /api/status — report current mode and MCP connection health."""
        client = _mcp_client
        connected = client is not None and client.connected
        self._json_response(200, {
            "status": "ok",
            "mode": "mcp" if connected else "local",
            "mcpConnected": connected,
            "serverInfo": client.server_info if connected else None,
            "futureWorkEnabled": _enable_future_work_collector and connected,
        })

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
    global _mcp_client, _enable_future_work_collector

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    ap = argparse.ArgumentParser(description="Serve the project-structure-viz site locally.")
    ap.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    args = ap.parse_args()

    # Attempt MCP client connection if config is present
    config = _load_mcp_config()
    if config is not None:
        _enable_future_work_collector = bool(config.get("enableFutureWorkCollector", False))
        prefer = config.get("prefer", "mcp")
        if prefer == "local":
            logger.info("mcp-config.json prefer=local — running in local mode")
        else:
            srv = config.get("server", {})
            command = srv.get("command", "")
            srv_args = srv.get("args", [])
            env = srv.get("env") or None
            if command:
                client = McpClient(command, srv_args, env)
                if client.connect():
                    _mcp_client = client
                    logger.info("MCP mode active")
                else:
                    logger.warning("MCP connection failed — running in local mode")
            else:
                logger.warning("mcp-config.json missing server.command — running in local mode")

    server = http.server.HTTPServer(("", args.port), Handler)
    print(f"Serving at http://localhost:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", flush=True)
    finally:
        if _mcp_client is not None:
            _mcp_client.disconnect()


if __name__ == "__main__":
    main()
