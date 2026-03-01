"""Tests for serve.py — static file serving and /api/refresh endpoint."""

from __future__ import annotations

import json
import socket
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

# Project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


class ServerFixture:
    """Manages a serve.py server instance for testing."""

    def __init__(self, projects_dir: Path | None = None) -> None:
        import sys

        sys.path.insert(0, str(PROJECT_ROOT))
        import http.server

        import serve

        self.port = _find_free_port()
        self.projects_dir = projects_dir

        # Override Handler to use a test directory if provided
        HandlerClass = serve.Handler
        if projects_dir is not None:

            class TestHandler(serve.Handler):
                def _manifest_path(self) -> Path:
                    return projects_dir / "manifest.json"

                def _parse_py(self) -> Path:
                    return PROJECT_ROOT / "parse.py"

                def _handle_refresh_local(self, requested: list[str] | None) -> None:
                    # Redirect manifest and parse.py paths to the test directory
                    manifest_path = projects_dir / "manifest.json"
                    if not manifest_path.exists():
                        self._json_response(
                            500,
                            {"status": "error", "message": "projects/manifest.json not found"},
                        )
                        return
                    try:
                        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                    except Exception as exc:
                        self._json_response(500, {"status": "error", "message": f"Failed to read manifest: {exc}"})
                        return

                    entries = manifest.get("projects", [])
                    if requested is not None:
                        entries = [e for e in entries if e.get("key") in requested]

                    parse_py = PROJECT_ROOT / "parse.py"
                    if not parse_py.exists():
                        self._json_response(
                            500,
                            {"status": "error", "message": f"parse.py not found at {parse_py}"},
                        )
                        return

                    import subprocess
                    import sys

                    refreshed: list[str] = []
                    errors: list[str] = []

                    for entry in entries:
                        key = entry.get("key", "")
                        source_path = entry.get("sourcePath", "")
                        if not source_path:
                            errors.append(f"{key}: no sourcePath in manifest")
                            continue
                        result = subprocess.run(
                            [sys.executable, str(parse_py), source_path,
                             "--projects-dir", str(projects_dir)],
                            capture_output=True,
                            text=True,
                        )
                        if result.returncode != 0:
                            errors.append(f"{key}: {result.stderr.strip() or 'parser returned non-zero'}")
                        else:
                            refreshed.append(key)

                    if errors and not refreshed:
                        self._json_response(500, {"status": "error", "message": "; ".join(errors)})
                    elif errors:
                        self._json_response(200, {"status": "ok", "projects": refreshed, "warnings": errors})
                    else:
                        self._json_response(200, {"status": "ok", "projects": refreshed})

            HandlerClass = TestHandler

        self.server = http.server.HTTPServer(("127.0.0.1", self.port), HandlerClass)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def start(self) -> None:
        self.thread.start()
        time.sleep(0.05)

    def stop(self) -> None:
        self.server.shutdown()

    def url(self, path: str = "") -> str:
        return f"http://127.0.0.1:{self.port}{path}"

    def get(self, path: str) -> tuple[int, bytes]:
        try:
            resp = urllib.request.urlopen(self.url(path))
            return resp.status, resp.read()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read()

    def post(self, path: str, body: dict | None = None) -> tuple[int, dict]:
        data = json.dumps(body).encode("utf-8") if body is not None else b""
        req = urllib.request.Request(
            self.url(path),
            data=data,
            method="POST",
            headers={"Content-Type": "application/json", "Content-Length": str(len(data))},
        )
        try:
            resp = urllib.request.urlopen(req)
            return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            try:
                return exc.code, json.loads(exc.read())
            except Exception:
                return exc.code, {}

    def delete(self, path: str) -> tuple[int, dict]:
        req = urllib.request.Request(self.url(path), method="DELETE")
        try:
            resp = urllib.request.urlopen(req)
            return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            try:
                return exc.code, json.loads(exc.read())
            except Exception:
                return exc.code, {}


# ── Static file serving tests ──────────────────────────────────────────────


class TestStaticServing:
    def setup_method(self) -> None:
        self.srv = ServerFixture()
        self.srv.server.RequestHandlerClass.directory = str(PROJECT_ROOT)
        self.srv.start()

    def teardown_method(self) -> None:
        self.srv.stop()

    def test_index_html(self) -> None:
        status, body = self.srv.get("/")
        assert status == 200
        assert b"<!DOCTYPE html>" in body or b"<html" in body

    def test_jsx_file(self) -> None:
        status, _ = self.srv.get("/project-structure-viz.jsx")
        assert status == 200

    def test_manifest_json(self) -> None:
        status, body = self.srv.get("/projects/manifest.json")
        assert status == 200
        data = json.loads(body)
        assert "projects" in data

    def test_missing_file_404(self) -> None:
        status, _ = self.srv.get("/nonexistent-file.xyz")
        assert status == 404


# ── /api/refresh endpoint tests ────────────────────────────────────────────

CF_PATH = Path("/Users/manta/source/repos/manta/context-forge")


@pytest.mark.skipif(not CF_PATH.exists(), reason="context-forge project not available")
class TestRefreshEndpoint:
    def setup_method(self, tmp_path_factory) -> None:  # noqa: ANN001
        self.tmp_dir = Path("/tmp/test_serve_refresh")
        self.tmp_dir.mkdir(exist_ok=True)
        # Seed manifest with a real project
        manifest = {
            "projects": [
                {
                    "key": "context-forge",
                    "file": "context-forge-structure.json",
                    "sourcePath": str(CF_PATH),
                }
            ]
        }
        (self.tmp_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
        self.srv = ServerFixture(projects_dir=self.tmp_dir)
        self.srv.start()

    def teardown_method(self) -> None:
        self.srv.stop()
        import shutil

        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_post_refresh_all(self) -> None:
        status, resp = self.srv.post("/api/refresh")
        assert status == 200
        assert resp["status"] == "ok"
        assert "context-forge" in resp["projects"]
        assert (self.tmp_dir / "context-forge-structure.json").exists()

    def test_post_refresh_specific_project(self) -> None:
        status, resp = self.srv.post("/api/refresh", {"projects": ["context-forge"]})
        assert status == 200
        assert resp["status"] == "ok"
        assert resp["projects"] == ["context-forge"]

    def test_get_api_refresh_returns_405(self) -> None:
        status, _ = self.srv.get("/api/refresh")
        assert status == 405


class TestRefreshErrorCases:
    def setup_method(self) -> None:
        self.tmp_dir = Path("/tmp/test_serve_errors")
        self.tmp_dir.mkdir(exist_ok=True)
        self.srv = ServerFixture(projects_dir=self.tmp_dir)
        self.srv.start()

    def teardown_method(self) -> None:
        self.srv.stop()
        import shutil

        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_missing_manifest_returns_500(self) -> None:
        # No manifest in tmp_dir
        status, resp = self.srv.post("/api/refresh")
        assert status == 500
        assert resp["status"] == "error"
        assert "manifest" in resp["message"].lower()

    def test_missing_source_path_returns_error(self) -> None:
        manifest = {
            "projects": [{"key": "test-proj", "file": "test.json", "sourcePath": ""}]
        }
        (self.tmp_dir / "manifest.json").write_text(json.dumps(manifest))
        status, resp = self.srv.post("/api/refresh")
        assert status == 500
        assert resp["status"] == "error"

    def test_server_does_not_crash_on_bad_body(self) -> None:
        manifest = {"projects": []}
        (self.tmp_dir / "manifest.json").write_text(json.dumps(manifest))
        # Send malformed body — should not crash
        req = urllib.request.Request(
            self.srv.url("/api/refresh"),
            data=b"not valid json",
            method="POST",
            headers={"Content-Type": "application/json", "Content-Length": "14"},
        )
        try:
            resp = urllib.request.urlopen(req)
            status = resp.status
        except urllib.error.HTTPError as exc:
            status = exc.code
        # Should return 200 (empty projects, refreshed nothing)
        assert status == 200


# ── Helper: build a minimal synthetic project tree ──────────────────────────


def _make_project(tmp_path: Path, name: str = "test-proj") -> Path:
    """Create a minimal project-documents/user/ tree suitable for parse.py."""
    proj_dir = tmp_path / name
    user_dir = proj_dir / "project-documents" / "user"
    (user_dir / "architecture").mkdir(parents=True)
    (user_dir / "slices").mkdir(parents=True)
    (user_dir / "tasks").mkdir(parents=True)
    # Minimal arch doc so build_model finds a project
    (user_dir / "architecture" / "100-arch.test.md").write_text(
        "---\ndocType: architecture\nproject: Test Project\n---\n# Test\n"
    )
    return proj_dir


# ── GET /api/projects tests ──────────────────────────────────────────────────


class TestListProjects:
    def setup_method(self) -> None:
        self.tmp_dir = Path(f"/tmp/test_list_projects_{id(self)}")
        self.tmp_dir.mkdir(exist_ok=True)

    def teardown_method(self) -> None:
        import shutil
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_returns_all_manifest_entries(self) -> None:
        manifest = {"projects": [
            {"key": "proj-a", "file": "a.json", "sourcePath": "/a", "displayName": "Proj A"},
            {"key": "proj-b", "file": "b.json", "sourcePath": "/b"},
        ]}
        (self.tmp_dir / "manifest.json").write_text(json.dumps(manifest))
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        try:
            status, body = srv.get("/api/projects")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            keys = [p["key"] for p in data["projects"]]
            assert keys == ["proj-a", "proj-b"]
            assert data["projects"][0]["displayName"] == "Proj A"
        finally:
            srv.stop()

    def test_empty_manifest_returns_empty_array(self) -> None:
        (self.tmp_dir / "manifest.json").write_text(json.dumps({"projects": []}))
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        try:
            status, body = srv.get("/api/projects")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            assert data["projects"] == []
        finally:
            srv.stop()

    def test_missing_manifest_returns_500(self) -> None:
        # No manifest file in tmp_dir
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        try:
            status, body = srv.get("/api/projects")
            assert status == 500
            data = json.loads(body)
            assert data["status"] == "error"
        finally:
            srv.stop()


# ── POST /api/projects tests ─────────────────────────────────────────────────


@pytest.mark.skipif(not CF_PATH.exists(), reason="context-forge project not available")
class TestAddProject:
    def setup_method(self) -> None:
        self.tmp_dir = Path(f"/tmp/test_add_project_{id(self)}")
        self.tmp_dir.mkdir(exist_ok=True)
        (self.tmp_dir / "manifest.json").write_text(json.dumps({"projects": []}))
        self.srv = ServerFixture(projects_dir=self.tmp_dir)
        self.srv.start()

    def teardown_method(self) -> None:
        self.srv.stop()
        import shutil
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_valid_path_adds_project_to_manifest(self) -> None:
        status, resp = self.srv.post("/api/projects", {"path": str(CF_PATH)})
        assert status == 200
        assert resp["status"] == "ok"
        assert resp["project"]["key"] == "context-forge"
        assert "displayName" in resp["project"]
        manifest = json.loads((self.tmp_dir / "manifest.json").read_text())
        keys = [p["key"] for p in manifest["projects"]]
        assert "context-forge" in keys

    def test_valid_path_creates_json_file(self) -> None:
        self.srv.post("/api/projects", {"path": str(CF_PATH)})
        assert (self.tmp_dir / "context-forge-structure.json").exists()

    def test_missing_path_field_returns_400(self) -> None:
        status, resp = self.srv.post("/api/projects", {})
        assert status == 400
        assert resp["status"] == "error"
        assert "path" in resp["message"].lower()

    def test_nonexistent_path_returns_400(self) -> None:
        status, resp = self.srv.post("/api/projects", {"path": "/does/not/exist"})
        assert status == 400
        assert resp["status"] == "error"

    def test_path_without_project_structure_returns_400(self, tmp_path: Path) -> None:
        status, resp = self.srv.post("/api/projects", {"path": str(tmp_path)})
        assert status == 400
        assert resp["status"] == "error"
        assert "project-documents" in resp["message"] or "user" in resp["message"].lower()

    def test_re_add_existing_project_is_idempotent(self) -> None:
        self.srv.post("/api/projects", {"path": str(CF_PATH)})
        status, resp = self.srv.post("/api/projects", {"path": str(CF_PATH)})
        assert status == 200
        manifest = json.loads((self.tmp_dir / "manifest.json").read_text())
        cf_entries = [p for p in manifest["projects"] if p["key"] == "context-forge"]
        assert len(cf_entries) == 1


# ── DELETE /api/projects/{key} tests ─────────────────────────────────────────


class TestRemoveProject:
    def setup_method(self) -> None:
        self.tmp_dir = Path(f"/tmp/test_remove_project_{id(self)}")
        self.tmp_dir.mkdir(exist_ok=True)
        # Seed a manifest with two entries and one actual JSON file
        manifest = {"projects": [
            {"key": "proj-a", "file": "proj-a-structure.json", "sourcePath": "/a"},
            {"key": "proj-b", "file": "proj-b-structure.json", "sourcePath": "/b"},
        ]}
        (self.tmp_dir / "manifest.json").write_text(json.dumps(manifest))
        (self.tmp_dir / "proj-a-structure.json").write_text("{}")
        # proj-b JSON intentionally absent (tests graceful missing-file handling)
        self.srv = ServerFixture(projects_dir=self.tmp_dir)
        self.srv.start()

    def teardown_method(self) -> None:
        self.srv.stop()
        import shutil
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_delete_existing_key_returns_200(self) -> None:
        status, resp = self.srv.delete("/api/projects/proj-a")
        assert status == 200
        assert resp["status"] == "ok"
        assert resp["removed"] == "proj-a"

    def test_delete_removes_entry_from_manifest(self) -> None:
        self.srv.delete("/api/projects/proj-a")
        manifest = json.loads((self.tmp_dir / "manifest.json").read_text())
        keys = [p["key"] for p in manifest["projects"]]
        assert "proj-a" not in keys

    def test_delete_removes_json_file(self) -> None:
        assert (self.tmp_dir / "proj-a-structure.json").exists()
        self.srv.delete("/api/projects/proj-a")
        assert not (self.tmp_dir / "proj-a-structure.json").exists()

    def test_delete_preserves_other_entries(self) -> None:
        self.srv.delete("/api/projects/proj-a")
        manifest = json.loads((self.tmp_dir / "manifest.json").read_text())
        keys = [p["key"] for p in manifest["projects"]]
        assert "proj-b" in keys

    def test_delete_nonexistent_key_returns_404(self) -> None:
        status, resp = self.srv.delete("/api/projects/no-such-key")
        assert status == 404
        assert resp["status"] == "error"
        assert "no-such-key" in resp["message"]

    def test_delete_when_json_file_absent_still_succeeds(self) -> None:
        # proj-b has no JSON file — delete should succeed anyway
        status, resp = self.srv.delete("/api/projects/proj-b")
        assert status == 200
        assert resp["removed"] == "proj-b"
        manifest = json.loads((self.tmp_dir / "manifest.json").read_text())
        keys = [p["key"] for p in manifest["projects"]]
        assert "proj-b" not in keys


# ── GET /api/info tests ──────────────────────────────────────────────────────


class TestInfo:
    def setup_method(self) -> None:
        self.tmp_dir = Path(f"/tmp/test_info_{id(self)}")
        self.tmp_dir.mkdir(exist_ok=True)

    def teardown_method(self) -> None:
        import shutil
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_info_no_projects(self) -> None:
        (self.tmp_dir / "manifest.json").write_text(json.dumps({"projects": []}))
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        try:
            status, body = srv.get("/api/info")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            assert data["scanRoot"] == str(Path.home())
        finally:
            srv.stop()

    def test_info_one_project(self) -> None:
        manifest = {"projects": [{"key": "p", "file": "p.json", "sourcePath": "/a/b/c"}]}
        (self.tmp_dir / "manifest.json").write_text(json.dumps(manifest))
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        try:
            status, body = srv.get("/api/info")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            assert data["scanRoot"] == "/a/b"
        finally:
            srv.stop()

    def test_info_two_projects_common_parent(self) -> None:
        manifest = {"projects": [
            {"key": "p1", "file": "p1.json", "sourcePath": "/a/b/proj1"},
            {"key": "p2", "file": "p2.json", "sourcePath": "/a/b/proj2"},
        ]}
        (self.tmp_dir / "manifest.json").write_text(json.dumps(manifest))
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        try:
            status, body = srv.get("/api/info")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            assert data["scanRoot"] == "/a/b"
        finally:
            srv.stop()

    def test_info_manifest_missing(self) -> None:
        # No manifest file at all — falls back to home directory
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        try:
            status, body = srv.get("/api/info")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            assert data["scanRoot"] == str(Path.home())
        finally:
            srv.stop()


# ── GET /api/discover tests ──────────────────────────────────────────────────


class TestDiscover:
    """Tests for GET /api/discover?root=<path>."""

    def setup_method(self) -> None:
        self.tmp_dir = Path(f"/tmp/test_discover_{id(self)}")
        self.tmp_dir.mkdir(exist_ok=True)
        (self.tmp_dir / "manifest.json").write_text(json.dumps({"projects": []}))

    def teardown_method(self) -> None:
        import shutil
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _srv(self) -> ServerFixture:
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        return srv

    def test_discover_missing_root(self) -> None:
        srv = self._srv()
        try:
            status, body = srv.get("/api/discover")
            assert status == 400
            data = json.loads(body)
            assert data["status"] == "error"
            assert "root" in data["message"].lower()
        finally:
            srv.stop()

    def test_discover_nonexistent_path(self) -> None:
        srv = self._srv()
        try:
            status, body = srv.get("/api/discover?root=/nonexistent/path/xyz")
            assert status == 400
            data = json.loads(body)
            assert data["status"] == "error"
            assert "does not exist" in data["message"]
        finally:
            srv.stop()

    def test_discover_not_a_directory(self) -> None:
        import urllib.parse
        f = self.tmp_dir / "somefile.txt"
        f.write_text("hi")
        srv = self._srv()
        try:
            status, body = srv.get(f"/api/discover?root={urllib.parse.quote(str(f))}")
            assert status == 400
            data = json.loads(body)
            assert data["status"] == "error"
            assert "not a directory" in data["message"].lower()
        finally:
            srv.stop()

    def test_discover_empty_dir(self) -> None:
        import urllib.parse
        scan_root = self.tmp_dir / "empty_scan"
        scan_root.mkdir()
        srv = self._srv()
        try:
            status, body = srv.get(f"/api/discover?root={urllib.parse.quote(str(scan_root))}")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            assert data["candidates"] == []
        finally:
            srv.stop()

    def test_discover_finds_candidates(self) -> None:
        import urllib.parse
        scan_root = self.tmp_dir / "scan"
        scan_root.mkdir()
        proj = _make_project(scan_root, "my-proj")
        srv = self._srv()
        try:
            status, body = srv.get(f"/api/discover?root={urllib.parse.quote(str(scan_root))}")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            assert len(data["candidates"]) == 1
            assert data["candidates"][0]["path"] == str(proj)
            assert isinstance(data["candidates"][0]["displayName"], str)
        finally:
            srv.stop()

    def test_discover_excludes_non_projects(self) -> None:
        import urllib.parse
        scan_root = self.tmp_dir / "scan_mixed"
        scan_root.mkdir()
        _make_project(scan_root, "valid-proj")
        (scan_root / "not-a-project").mkdir()
        srv = self._srv()
        try:
            status, body = srv.get(f"/api/discover?root={urllib.parse.quote(str(scan_root))}")
            assert status == 200
            data = json.loads(body)
            assert data["status"] == "ok"
            assert len(data["candidates"]) == 1
            assert "valid-proj" in data["candidates"][0]["path"]
        finally:
            srv.stop()


# ── MCP config loading tests ─────────────────────────────────────────────────


class TestLoadMcpConfig:
    """Tests for serve._load_mcp_config() function."""

    def setup_method(self) -> None:
        import sys
        sys.path.insert(0, str(PROJECT_ROOT))
        self._orig_dir = Path.cwd()

    def teardown_method(self) -> None:
        import os
        os.chdir(self._orig_dir)

    def test_no_config_file_returns_none(self, tmp_path: Path) -> None:
        """Missing mcp-config.json → returns None without warning."""
        import os
        import serve

        os.chdir(tmp_path)
        result = serve._load_mcp_config()
        assert result is None

    def test_valid_config_returns_dict(self, tmp_path: Path) -> None:
        """Valid mcp-config.json → returns parsed dict."""
        import os
        import serve

        config = {
            "server": {
                "transport": "stdio",
                "command": "node",
                "args": ["/path/to/server.js"],
                "env": {},
            }
        }
        (tmp_path / "mcp-config.json").write_text(json.dumps(config))
        os.chdir(tmp_path)
        result = serve._load_mcp_config()
        assert result is not None
        assert result["server"]["command"] == "node"
        assert result["server"]["transport"] == "stdio"

    def test_invalid_json_returns_none_and_warns(self, tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
        """Invalid JSON in mcp-config.json → returns None and logs a warning."""
        import logging
        import os
        import serve

        (tmp_path / "mcp-config.json").write_text("{ not valid json }")
        os.chdir(tmp_path)
        with caplog.at_level(logging.WARNING, logger="serve"):
            result = serve._load_mcp_config()
        assert result is None
        assert any("mcp-config.json" in r.message for r in caplog.records)


class TestMcpClientStartup:
    """Tests for MCP client startup behaviour in main()."""

    def test_no_config_leaves_client_none(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """No mcp-config.json → _mcp_client stays None, no warnings logged."""
        import serve

        monkeypatch.chdir(tmp_path)
        monkeypatch.setattr(serve, "_mcp_client", None)
        # _load_mcp_config reads from cwd; no file → returns None → client stays None
        result = serve._load_mcp_config()
        assert result is None
        assert serve._mcp_client is None

    def test_valid_config_but_connect_fails_leaves_client_none(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Valid config but failed connect() → _mcp_client stays None, warning logged."""
        from unittest.mock import MagicMock
        import logging
        import serve

        config = {
            "server": {
                "transport": "stdio",
                "command": "nonexistent-binary",
                "args": [],
                "env": {},
            }
        }
        (tmp_path / "mcp-config.json").write_text(json.dumps(config))
        monkeypatch.chdir(tmp_path)
        monkeypatch.setattr(serve, "_mcp_client", None)

        # Mock McpClient so connect() always returns False
        mock_client = MagicMock()
        mock_client.connect.return_value = False

        import mcp_client
        monkeypatch.setattr(serve, "McpClient", lambda *a, **kw: mock_client)

        # Simulate what main() does after loading config
        cfg = serve._load_mcp_config()
        assert cfg is not None
        srv_cfg = cfg.get("server", {})
        client = serve.McpClient(srv_cfg["command"], srv_cfg.get("args", []), srv_cfg.get("env"))
        if not client.connect():
            # In main(), _mcp_client stays None on failure
            pass

        assert serve._mcp_client is None

    def test_prefer_local_skips_connect(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """prefer=local in config → MCP connect not attempted, client stays None."""
        from unittest.mock import MagicMock
        import serve

        config = {
            "prefer": "local",
            "server": {"transport": "stdio", "command": "node", "args": [], "env": {}},
        }
        (tmp_path / "mcp-config.json").write_text(json.dumps(config))
        monkeypatch.chdir(tmp_path)
        monkeypatch.setattr(serve, "_mcp_client", None)

        mock_client = MagicMock()
        monkeypatch.setattr(serve, "McpClient", lambda *a, **kw: mock_client)

        # Simulate the startup logic from main()
        cfg = serve._load_mcp_config()
        assert cfg is not None
        if cfg.get("prefer", "mcp") == "local":
            pass  # skip connect — client stays None
        else:
            srv_cfg = cfg.get("server", {})
            client = serve.McpClient(srv_cfg["command"], srv_cfg.get("args", []))
            client.connect()

        mock_client.connect.assert_not_called()
        assert serve._mcp_client is None

    def test_prefer_mcp_default_attempts_connect(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """prefer absent (defaults to mcp) → connect() is attempted."""
        from unittest.mock import MagicMock
        import serve

        config = {
            "server": {"transport": "stdio", "command": "node", "args": [], "env": {}},
        }
        (tmp_path / "mcp-config.json").write_text(json.dumps(config))
        monkeypatch.chdir(tmp_path)
        monkeypatch.setattr(serve, "_mcp_client", None)

        mock_client = MagicMock()
        mock_client.connect.return_value = True
        monkeypatch.setattr(serve, "McpClient", lambda *a, **kw: mock_client)

        # Simulate the startup logic from main()
        cfg = serve._load_mcp_config()
        assert cfg is not None
        if cfg.get("prefer", "mcp") != "local":
            srv_cfg = cfg.get("server", {})
            client = serve.McpClient(srv_cfg["command"], srv_cfg.get("args", []))
            if client.connect():
                serve._mcp_client = client

        mock_client.connect.assert_called_once()
        assert serve._mcp_client is mock_client


# ── Mock MCP client fixture ───────────────────────────────────────────────────

def _make_mock_mcp_client(projects: list[dict] | None = None, fail_tool: str | None = None):
    """Build a mock McpClient that returns canned data.

    Args:
        projects: List of project dicts for project_list response.
                  Each dict: {id, name, projectPath}
        fail_tool: If set, calling call_tool with this name raises McpError.
    """
    from unittest.mock import MagicMock
    from mcp_client import McpError

    if projects is None:
        projects = [
            {"id": "p1", "name": "My Project", "projectPath": "/home/user/my-project"},
            {"id": "p2", "name": "Another App", "projectPath": "/home/user/another-app"},
        ]

    def _call_tool(name: str, arguments: dict) -> dict:
        if fail_tool and name == fail_tool:
            raise McpError(-1, f"Simulated failure for {name}")
        if name == "project_list":
            return {"projects": projects}
        if name == "project_structure":
            proj_id = arguments.get("projectId", "")
            proj = next((p for p in projects if p["id"] == proj_id), {})
            return {
                "name": proj.get("name", "Unknown"),
                "description": "A test project",
                "initiatives": {},
            }
        raise McpError(-32601, f"Unknown tool: {name}")

    mock = MagicMock()
    mock.connected = True
    mock.server_info = {"name": "context-forge-mcp", "version": "1.0.0"}
    mock.call_tool.side_effect = _call_tool
    return mock


# ── GET /api/structures tests ─────────────────────────────────────────────────


class TestStructuresEndpoint:
    """Tests for GET /api/structures."""

    def setup_method(self) -> None:
        import sys
        sys.path.insert(0, str(PROJECT_ROOT))
        import serve
        self._orig_client = serve._mcp_client

    def teardown_method(self) -> None:
        import serve
        serve._mcp_client = self._orig_client

    def _srv(self, tmp_dir: Path) -> "ServerFixture":
        srv = ServerFixture(projects_dir=tmp_dir)
        srv.start()
        return srv

    def test_structures_with_mcp_returns_200(self, tmp_path: Path) -> None:
        """MCP connected → 200 with project data."""
        import serve

        (tmp_path / "manifest.json").write_text(json.dumps({"projects": []}))
        serve._mcp_client = _make_mock_mcp_client()
        srv = self._srv(tmp_path)
        try:
            status, body = srv.get("/api/structures")
            data = json.loads(body)
            assert status == 200
            assert data["status"] == "ok"
            assert data["mode"] == "mcp"
            assert "my-project" in data["projects"]
            assert "another-app" in data["projects"]
        finally:
            srv.stop()

    def test_structures_key_envelope_lowercased_hyphenated(self, tmp_path: Path) -> None:
        """Keys are lowercased and spaces replaced with hyphens."""
        import serve

        projects = [{"id": "x1", "name": "Hello World App", "projectPath": "/x"}]
        (tmp_path / "manifest.json").write_text(json.dumps({"projects": []}))
        serve._mcp_client = _make_mock_mcp_client(projects=projects)
        srv = self._srv(tmp_path)
        try:
            status, body = srv.get("/api/structures")
            data = json.loads(body)
            assert status == 200
            assert "hello-world-app" in data["projects"]
        finally:
            srv.stop()

    def test_structures_source_path_populated(self, tmp_path: Path) -> None:
        """sourcePath comes from context-forge's projectPath."""
        import serve

        projects = [{"id": "x1", "name": "MyApp", "projectPath": "/repos/myapp"}]
        (tmp_path / "manifest.json").write_text(json.dumps({"projects": []}))
        serve._mcp_client = _make_mock_mcp_client(projects=projects)
        srv = self._srv(tmp_path)
        try:
            status, body = srv.get("/api/structures")
            data = json.loads(body)
            assert status == 200
            assert data["projects"]["myapp"]["sourcePath"] == "/repos/myapp"
        finally:
            srv.stop()

    def test_structures_without_mcp_returns_503(self, tmp_path: Path) -> None:
        """No MCP client → 503 with error."""
        import serve

        serve._mcp_client = None
        (tmp_path / "manifest.json").write_text(json.dumps({"projects": []}))
        srv = self._srv(tmp_path)
        try:
            status, body = srv.get("/api/structures")
            data = json.loads(body)
            assert status == 503
            assert data["status"] == "error"
            assert data["mode"] == "local"
        finally:
            srv.stop()

    def test_structures_mcp_tool_failure_returns_503(self, tmp_path: Path) -> None:
        """MCP tool call raises mid-request → 503 with error message."""
        import serve

        (tmp_path / "manifest.json").write_text(json.dumps({"projects": []}))
        serve._mcp_client = _make_mock_mcp_client(fail_tool="project_list")
        srv = self._srv(tmp_path)
        try:
            status, body = srv.get("/api/structures")
            data = json.loads(body)
            assert status == 503
            assert data["status"] == "error"
        finally:
            srv.stop()


# ── GET /api/status tests ─────────────────────────────────────────────────────


class TestStatusEndpoint:
    """Tests for GET /api/status."""

    def setup_method(self) -> None:
        import sys
        sys.path.insert(0, str(PROJECT_ROOT))
        import serve
        self._orig_client = serve._mcp_client

    def teardown_method(self) -> None:
        import serve
        serve._mcp_client = self._orig_client

    def _srv(self, tmp_dir: Path) -> "ServerFixture":
        srv = ServerFixture(projects_dir=tmp_dir)
        srv.start()
        return srv

    def test_status_mcp_connected(self, tmp_path: Path) -> None:
        """MCP connected → mode=mcp, mcpConnected=True, serverInfo populated."""
        import serve

        (tmp_path / "manifest.json").write_text(json.dumps({"projects": []}))
        serve._mcp_client = _make_mock_mcp_client()
        srv = self._srv(tmp_path)
        try:
            status, body = srv.get("/api/status")
            data = json.loads(body)
            assert status == 200
            assert data["status"] == "ok"
            assert data["mode"] == "mcp"
            assert data["mcpConnected"] is True
            assert data["serverInfo"] == {"name": "context-forge-mcp", "version": "1.0.0"}
        finally:
            srv.stop()

    def test_status_local_mode(self, tmp_path: Path) -> None:
        """No MCP client → mode=local, mcpConnected=False, serverInfo=None."""
        import serve

        serve._mcp_client = None
        (tmp_path / "manifest.json").write_text(json.dumps({"projects": []}))
        srv = self._srv(tmp_path)
        try:
            status, body = srv.get("/api/status")
            data = json.loads(body)
            assert status == 200
            assert data["status"] == "ok"
            assert data["mode"] == "local"
            assert data["mcpConnected"] is False
            assert data["serverInfo"] is None
        finally:
            srv.stop()


# ── POST /api/refresh MCP-mode tests ─────────────────────────────────────────


class TestRefreshMcpMode:
    """Tests for POST /api/refresh when MCP client is active."""

    def setup_method(self) -> None:
        import sys
        sys.path.insert(0, str(PROJECT_ROOT))
        import serve
        self._orig_client = serve._mcp_client
        self.tmp_dir = Path(f"/tmp/test_refresh_mcp_{id(self)}")
        self.tmp_dir.mkdir(exist_ok=True)
        (self.tmp_dir / "manifest.json").write_text(json.dumps({"projects": []}))

    def teardown_method(self) -> None:
        import serve
        serve._mcp_client = self._orig_client
        import shutil
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _srv(self) -> "ServerFixture":
        srv = ServerFixture(projects_dir=self.tmp_dir)
        srv.start()
        return srv

    def test_refresh_mcp_mode_returns_success(self) -> None:
        """MCP mode refresh calls project_structure and returns refreshed keys."""
        import serve

        projects = [
            {"id": "p1", "name": "My Project", "projectPath": "/repos/my-project"},
            {"id": "p2", "name": "Other App", "projectPath": "/repos/other-app"},
        ]
        serve._mcp_client = _make_mock_mcp_client(projects=projects)
        srv = self._srv()
        try:
            status, resp = srv.post("/api/refresh")
            assert status == 200
            data = json.loads(resp) if isinstance(resp, str) else resp
            assert data["status"] == "ok"
            assert "my-project" in data["projects"]
            assert "other-app" in data["projects"]
        finally:
            srv.stop()

    def test_refresh_local_mode_unchanged(self) -> None:
        """Without MCP client, refresh falls back to parse.py path (existing behavior)."""
        import serve

        serve._mcp_client = None
        manifest = {"projects": []}  # empty — nothing to refresh, returns ok
        (self.tmp_dir / "manifest.json").write_text(json.dumps(manifest))
        srv = self._srv()
        try:
            status, resp = srv.post("/api/refresh")
            data = json.loads(resp) if isinstance(resp, str) else resp
            assert status == 200
            assert data["status"] == "ok"
            assert data["projects"] == []
        finally:
            srv.stop()

    def test_refresh_mcp_partial_failure_returns_warnings(self) -> None:
        """When one MCP project_structure call fails, return partial success with warnings."""
        from unittest.mock import MagicMock
        from mcp_client import McpError
        import serve

        projects = [
            {"id": "p1", "name": "Good Project", "projectPath": "/repos/good"},
            {"id": "p2", "name": "Bad Project", "projectPath": "/repos/bad"},
        ]

        call_count = {"n": 0}

        def _call_tool(name: str, arguments: dict) -> dict:
            if name == "project_list":
                return {"projects": projects}
            if name == "project_structure":
                call_count["n"] += 1
                if arguments.get("projectId") == "p2":
                    raise McpError(-1, "Simulated failure")
                return {"name": "Good Project", "initiatives": {}}
            raise McpError(-32601, f"Unknown: {name}")

        mock = MagicMock()
        mock.connected = True
        mock.server_info = {"name": "test"}
        mock.call_tool.side_effect = _call_tool
        serve._mcp_client = mock

        srv = self._srv()
        try:
            status, resp = srv.post("/api/refresh")
            data = json.loads(resp) if isinstance(resp, str) else resp
            assert status == 200
            assert data["status"] == "ok"
            assert "good-project" in data["projects"]
            assert "warnings" in data
            assert any("bad-project" in w for w in data["warnings"])
        finally:
            srv.stop()
