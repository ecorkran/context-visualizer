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

                def _handle_refresh(self) -> None:
                    # Patch manifest path in refresh handler for isolation
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

                    content_length = int(self.headers.get("Content-Length", 0))
                    requested: list[str] | None = None
                    if content_length > 0:
                        try:
                            body = json.loads(self.rfile.read(content_length))
                            requested = body.get("projects")
                        except Exception:
                            pass

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
