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


# ── Fixtures ──────────────────────────────────────────────────────────


def _make_project(tmp_path: Path) -> Path:
    """Build a minimal synthetic project-documents/user/ tree."""
    user_dir = tmp_path / "project-documents" / "user"
    arch_dir = user_dir / "architecture"
    feat_dir = user_dir / "features"
    slice_dir = user_dir / "slices"
    for d in (arch_dir, feat_dir, slice_dir):
        d.mkdir(parents=True)
    return user_dir


_SLICES_140 = """\
---
docType: slices
project: test-project
status: in_progress
dateCreated: 20260101
---

# Slice Plan: Test Initiative

## Slices

- 140 first slice

## Future Work

1. [ ] First future item — some detail here.

2. [ ] Second future item — more detail.

3. [ ] (780) Config System — TOML config, two tiers. Effort 2/5.

4. [ ] (781) Guide Install — Bundle prompt, guide_install tool. Effort 3/5.
"""

_ARCH_160 = """\
---
docType: architecture
project: test-project
archIndex: 160
status: in_progress
dateCreated: 20260226
---

# Architecture: New Initiative
"""

_FEATURE_750 = """\
---
docType: feature
project: test-project
status: ready
dateCreated: 20260101
---

# Feature 750
"""

_FEATURE_751 = """\
---
docType: feature
project: test-project
status: not-started
dateCreated: 20260101
---

# Feature 751
"""

_FEATURE_750_WITH_PARENT = """\
---
docType: feature
project: test-project
status: ready
parent: 140
dateCreated: 20260101
---

# Feature 750 (explicit parent)
"""

_FEATURE_751_WITH_PARENT = """\
---
docType: feature
project: test-project
status: not-started
parent: 140
dateCreated: 20260101
---

# Feature 751 (explicit parent)
"""


# ── Bug 1: futureWork parsing ──────────────────────────────────────────


class TestFutureWorkParsing:
    """futureWork in slicePlan must be populated from the slice plan file."""

    def test_future_work_items_extracted(self, tmp_path: Path) -> None:
        """futureWork should contain items parsed from ## Future Work section."""
        from parse import build_model

        user_dir = _make_project(tmp_path)
        arch_dir = user_dir / "architecture"
        (arch_dir / "140-slices.test-initiative.md").write_text(_SLICES_140)

        model = build_model(user_dir)
        sp = model["initiatives"]["140"]["slicePlan"]
        assert sp["futureWork"], "futureWork must not be empty"
        assert len(sp["futureWork"]) == 4

    def test_future_work_item_text_is_title_only(self, tmp_path: Path) -> None:
        """futureWork item names should be the title only, not the full description."""
        from parse import build_model

        user_dir = _make_project(tmp_path)
        arch_dir = user_dir / "architecture"
        (arch_dir / "140-slices.test-initiative.md").write_text(_SLICES_140)

        model = build_model(user_dir)
        names = [fw["name"] for fw in model["initiatives"]["140"]["slicePlan"]["futureWork"]]
        # Title extracted before " — " separator
        assert "First future item" in names
        # Explicit-index items: title is text after the index, before " — " or ": "
        assert any("Config System" in n for n in names)
        # Detail text after " — " must not appear in names
        assert not any("some detail here" in n for n in names)

    def test_future_work_unnumbered_items_get_auto_index(self, tmp_path: Path) -> None:
        """Unnumbered future work items receive sequential indices after the last slice."""
        from parse import build_model

        user_dir = _make_project(tmp_path)
        (user_dir / "architecture" / "140-slices.test-initiative.md").write_text(_SLICES_140)

        model = build_model(user_dir)
        fw = model["initiatives"]["140"]["slicePlan"]["futureWork"]
        # Items 1 and 2 have no explicit index — should get 141, 142 (base=140, no slices → next=141)
        auto_items = [f for f in fw if f["index"] not in ("780", "781")]
        assert all(f["index"] != "?" for f in auto_items), "auto-indexed items must not be '?'"

    def test_no_future_work_section_yields_empty(self, tmp_path: Path) -> None:
        """A slice plan with no ## Future Work section yields an empty list."""
        from parse import build_model

        slices_no_fw = """\
---
docType: slices
project: test-project
status: not_started
---

# Slice Plan

## Slices

- 200 only slice
"""
        user_dir = _make_project(tmp_path)
        (user_dir / "architecture" / "200-slices.no-future.md").write_text(slices_no_fw)

        model = build_model(user_dir)
        sp = model["initiatives"]["200"]["slicePlan"]
        assert sp["futureWork"] == []


# ── Plan slice extraction ──────────────────────────────────────────────

_SLICES_160 = """\
---
docType: slices
project: test-project
status: not_started
dateCreated: 20260226
---

# Slice Plan: New Initiative

## Foundation Work

1. [ ] **(161) Schema Standardization** — Normalize field naming. Effort 3/5.

2. [x] **(162) Config System** — TOML config. Effort 2/5.

## Feature Slices

3. [ ] **(163) Artifact Introspection** — Read artifacts. Effort 3/5.

## Future Work

1. [ ] Future thing — not a slice.
"""


class TestPlanSliceExtraction:
    """Planned slices in a slice plan must appear in the initiative when no actual file exists."""

    def test_plan_slices_shown_when_no_slice_files(self, tmp_path: Path) -> None:
        """Slices described in the plan appear in the initiative if no slice file exists."""
        from parse import build_model

        user_dir = _make_project(tmp_path)
        (user_dir / "architecture" / "160-arch.new-initiative.md").write_text(_ARCH_160)
        (user_dir / "architecture" / "160-slices.new-initiative.md").write_text(_SLICES_160)

        model = build_model(user_dir)
        slices = model["initiatives"]["160"]["slices"]
        indices = [s["index"] for s in slices]
        assert "161" in indices
        assert "162" in indices
        assert "163" in indices

    def test_plan_slices_not_duplicated_when_file_exists(self, tmp_path: Path) -> None:
        """When an actual slice file exists for an index, the plan entry is not duplicated."""
        from parse import build_model

        user_dir = _make_project(tmp_path)
        (user_dir / "architecture" / "160-arch.new-initiative.md").write_text(_ARCH_160)
        (user_dir / "architecture" / "160-slices.new-initiative.md").write_text(_SLICES_160)
        # Create an actual slice file for 161
        (user_dir / "slices" / "161-slice.schema-standardization.md").write_text(
            "---\nstatus: in_progress\n---\n# Slice 161\n"
        )

        model = build_model(user_dir)
        slices = model["initiatives"]["160"]["slices"]
        count_161 = sum(1 for s in slices if s["index"] == "161")
        assert count_161 == 1, "index 161 must appear exactly once"

    def test_future_work_items_not_treated_as_plan_slices(self, tmp_path: Path) -> None:
        """Items in ## Future Work must not appear in initiative slices."""
        from parse import build_model

        user_dir = _make_project(tmp_path)
        (user_dir / "architecture" / "160-slices.new-initiative.md").write_text(_SLICES_160)

        model = build_model(user_dir)
        slices = model["initiatives"]["160"]["slices"]
        # Future Work items have no bold **(NNN)** pattern — they must not appear as slices
        assert len(slices) == 3  # Only 161, 162, 163


# ── Bug 2: feature parent attribution ─────────────────────────────────


class TestFeatureParentAttribution:
    """Features with explicit parent frontmatter must use it for attribution."""

    def _build_two_initiative_model(self, tmp_path: Path, *, with_parent: bool) -> dict:
        """Shared fixture: bases 140 + 160, features 750+751."""
        from parse import build_model

        user_dir = _make_project(tmp_path)
        arch_dir = user_dir / "architecture"
        feat_dir = user_dir / "features"

        (arch_dir / "140-slices.test-initiative.md").write_text(_SLICES_140)
        (arch_dir / "160-arch.new-initiative.md").write_text(_ARCH_160)

        if with_parent:
            (feat_dir / "750-feature.test-a.md").write_text(_FEATURE_750_WITH_PARENT)
            (feat_dir / "751-feature.test-b.md").write_text(_FEATURE_751_WITH_PARENT)
        else:
            (feat_dir / "750-feature.test-a.md").write_text(_FEATURE_750)
            (feat_dir / "751-feature.test-b.md").write_text(_FEATURE_751)

        return build_model(user_dir)

    def test_explicit_parent_overrides_nearest_base(self, tmp_path: Path) -> None:
        """Features with parent: 140 frontmatter must appear under 140, not 160."""
        model = self._build_two_initiative_model(tmp_path, with_parent=True)
        parents = {f["index"]: f.get("parent") for f in model["futureSlices"]}
        assert parents.get("750") == "140", "750 must be attributed to 140"
        assert parents.get("751") == "140", "751 must be attributed to 140"

    def test_without_parent_frontmatter_falls_back_to_nearest_base(
        self, tmp_path: Path
    ) -> None:
        """Features without parent frontmatter still use nearest-base (existing behavior)."""
        model = self._build_two_initiative_model(tmp_path, with_parent=False)
        parents = {f["index"]: f.get("parent") for f in model["futureSlices"]}
        # Without explicit parent, nearest base <= 750 is 160
        assert parents.get("750") == "160"
        assert parents.get("751") == "160"
