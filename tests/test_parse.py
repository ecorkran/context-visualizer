"""Tests for parse.py — focusing on CLI output modes and manifest management."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

# Project root for test invocations
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PARSE_PY = PROJECT_ROOT / "parse.py"

# Known project paths used by the visualizer
CF_PATH = Path("/Users/manta/source/repos/manta/context-forge")
ORCH_PATH = Path("/Users/manta/source/repos/manta/orchestration")


def _run_parser(*args: str) -> subprocess.CompletedProcess[str]:
    """Run parse.py with the given arguments."""
    return subprocess.run(
        [sys.executable, str(PARSE_PY), *args],
        capture_output=True,
        text=True,
    )


# ── update_manifest unit tests ─────────────────────────────────────────


class TestUpdateManifest:
    """Tests for the update_manifest function."""

    def test_creates_manifest_when_missing(self, tmp_path: Path) -> None:
        from parse import update_manifest

        update_manifest(tmp_path, "my-proj", "my-proj-structure.json", "/some/path")

        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert len(manifest["projects"]) == 1
        assert manifest["projects"][0]["key"] == "my-proj"
        assert manifest["projects"][0]["file"] == "my-proj-structure.json"
        assert manifest["projects"][0]["sourcePath"] == "/some/path"

    def test_merges_without_clobbering(self, tmp_path: Path) -> None:
        from parse import update_manifest

        update_manifest(tmp_path, "proj-a", "a.json", "/path/a")
        update_manifest(tmp_path, "proj-b", "b.json", "/path/b")

        manifest = json.loads((tmp_path / "manifest.json").read_text())
        keys = [p["key"] for p in manifest["projects"]]
        assert keys == ["proj-a", "proj-b"]

    def test_updates_existing_entry(self, tmp_path: Path) -> None:
        from parse import update_manifest

        update_manifest(tmp_path, "proj-a", "a.json", "/old/path")
        update_manifest(tmp_path, "proj-a", "a.json", "/new/path")

        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert len(manifest["projects"]) == 1
        assert manifest["projects"][0]["sourcePath"] == "/new/path"

    def test_preserves_other_entries_on_update(self, tmp_path: Path) -> None:
        from parse import update_manifest

        update_manifest(tmp_path, "proj-a", "a.json", "/path/a")
        update_manifest(tmp_path, "proj-b", "b.json", "/path/b")
        update_manifest(tmp_path, "proj-a", "a.json", "/path/a-v2")

        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert len(manifest["projects"]) == 2
        by_key = {p["key"]: p for p in manifest["projects"]}
        assert by_key["proj-a"]["sourcePath"] == "/path/a-v2"
        assert by_key["proj-b"]["sourcePath"] == "/path/b"


# ── CLI integration tests ──────────────────────────────────────────────


@pytest.mark.skipif(not CF_PATH.exists(), reason="context-forge project not available")
class TestCLIDefaultMode:
    """Tests for default output mode (write to projects/ dir)."""

    def test_writes_per_project_json(self, tmp_path: Path) -> None:
        result = _run_parser(str(CF_PATH), "--projects-dir", str(tmp_path))
        assert result.returncode == 0

        output_file = tmp_path / "context-forge-structure.json"
        assert output_file.exists()

        data = json.loads(output_file.read_text())
        assert "context-forge" in data

    def test_updates_manifest(self, tmp_path: Path) -> None:
        result = _run_parser(str(CF_PATH), "--projects-dir", str(tmp_path))
        assert result.returncode == 0

        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert len(manifest["projects"]) == 1
        entry = manifest["projects"][0]
        assert entry["key"] == "context-forge"
        assert entry["file"] == "context-forge-structure.json"
        assert entry["sourcePath"] != ""

    def test_multiple_projects(self, tmp_path: Path) -> None:
        if not ORCH_PATH.exists():
            pytest.skip("orchestration project not available")

        result = _run_parser(
            str(CF_PATH), str(ORCH_PATH), "--projects-dir", str(tmp_path),
        )
        assert result.returncode == 0

        manifest = json.loads((tmp_path / "manifest.json").read_text())
        keys = {p["key"] for p in manifest["projects"]}
        assert keys == {"context-forge", "orchestration"}

    def test_pretty_flag(self, tmp_path: Path) -> None:
        result = _run_parser(
            str(CF_PATH), "--projects-dir", str(tmp_path), "--pretty",
        )
        assert result.returncode == 0

        content = (tmp_path / "context-forge-structure.json").read_text()
        # Pretty-printed JSON has newlines and indentation
        assert "\n  " in content


@pytest.mark.skipif(not CF_PATH.exists(), reason="context-forge project not available")
class TestCLIExplicitOutput:
    """Tests for -o flag behavior."""

    def test_writes_to_specified_path(self, tmp_path: Path) -> None:
        out_file = tmp_path / "custom.json"
        result = _run_parser(str(CF_PATH), "-o", str(out_file))
        assert result.returncode == 0
        assert out_file.exists()

        data = json.loads(out_file.read_text())
        assert "context-forge" in data

    def test_does_not_create_manifest(self, tmp_path: Path) -> None:
        out_file = tmp_path / "custom.json"
        _run_parser(str(CF_PATH), "-o", str(out_file))
        assert not (tmp_path / "manifest.json").exists()

    def test_does_not_modify_existing_manifest(self, tmp_path: Path) -> None:
        # Pre-create a manifest
        manifest_dir = tmp_path / "projects"
        manifest_dir.mkdir()
        manifest_content = {"projects": [{"key": "existing", "file": "x.json", "sourcePath": ""}]}
        (manifest_dir / "manifest.json").write_text(json.dumps(manifest_content))

        out_file = tmp_path / "output.json"
        _run_parser(str(CF_PATH), "-o", str(out_file))

        # Manifest should be unchanged
        after = json.loads((manifest_dir / "manifest.json").read_text())
        assert after == manifest_content


class TestCLIErrorHandling:
    """Tests for error cases."""

    def test_invalid_project_path(self, tmp_path: Path) -> None:
        result = _run_parser(str(tmp_path / "nonexistent"))
        assert result.returncode != 0

    def test_no_user_dir(self, tmp_path: Path) -> None:
        result = _run_parser(str(tmp_path))
        assert result.returncode != 0
        assert "Error" in result.stderr
