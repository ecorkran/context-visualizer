#!/usr/bin/env python3
"""parse_project.py — Extract ai-project-guide structure into JSON for the visualizer.

Zero external dependencies (Python 3.10+ stdlib only).
Scans ``project-documents/user/`` for files matching the naming convention
and emits a JSON model consumable by *project-structure-viz.jsx*.

Usage:
    python parse_project.py /path/to/project [--pretty] [-o out.json]
    python parse_project.py proj1 proj2 --pretty
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ── Filename pattern ─────────────────────────────────────────────
# Matches: NNN-type.name[-split].md  (type may contain hyphens *before* the dot)
# Examples:
#   140-arch.context-forge-restructure.md
#   140-slices.context-forge-restructure.md
#   101-tasks.sdk-agent-provider.md
#   750-feature.auto-index-resolution.md
#   900-tasks.maintenance.md
#   050-arch_hld-orchestration.md   (underscore variant)
FILE_RE = re.compile(
    r"^(\d{3})"  # index
    r"[-_]"  # separator
    r"(concept|spec|hld|arch|slices|slice|tasks|feature|issue|review|analysis|maintenance)"
    r"[._]"  # type/name separator
    r"(.+?)"  # name (lazy)
    r"(?:-(\d+))?"  # optional split number
    r"\.md$",
    re.IGNORECASE,
)

# Frontmatter
FM_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
FM_KV = re.compile(r"^(\w[\w-]*):\s*(.+)$", re.MULTILINE)

# Task checkboxes
TASK_RE = re.compile(r"^(\s*)-\s*\[([ xX])\]\s+(.+)$", re.MULTILINE)

# Status normalization map
STATUS_MAP: dict[str, str] = {
    "complete": "complete",
    "completed": "complete",
    "done": "complete",
    "in_progress": "in-progress",
    "in-progress": "in-progress",
    "active": "in-progress",
    "not_started": "not-started",
    "not-started": "not-started",
    "ready": "not-started",
    "pending": "not-started",
    "planned": "not-started",
    "deprecated": "deprecated",
}


# ── Data ─────────────────────────────────────────────────────────
@dataclass
class DocInfo:
    index: int
    doc_type: str  # concept, spec, hld, arch, slices, slice, tasks, feature …
    name: str
    split: int | None = None
    status: str = "not-started"
    date_created: str | None = None
    date_updated: str | None = None
    project: str | None = None
    parent: str | None = None
    task_items: list[dict[str, Any]] = field(default_factory=list)
    path: Path | None = None


# ── Parsing helpers ──────────────────────────────────────────────

def _parse_frontmatter(text: str) -> dict[str, str]:
    m = FM_RE.match(text)
    if not m:
        return {}
    return {k.lower(): v.strip().strip("\"'") for k, v in FM_KV.findall(m.group(1))}


def _normalize_status(raw: str) -> str:
    return STATUS_MAP.get(raw.lower().replace(" ", "_").replace("-", "_"), "not-started")


def _parse_tasks(text: str) -> list[dict[str, Any]]:
    return [
        {"name": name.strip(), "done": mark.lower() == "x"}
        for _, mark, name in TASK_RE.findall(text)
    ]


def parse_file(path: Path) -> DocInfo | None:
    m = FILE_RE.match(path.name)
    if not m:
        return None
    idx, doc_type, name, split = m.groups()
    doc_type = doc_type.lower()
    name = name.lower()

    text = path.read_text(encoding="utf-8", errors="replace")
    fm = _parse_frontmatter(text)

    status = _normalize_status(fm.get("status", "not-started"))
    items = _parse_tasks(text) if doc_type == "tasks" else []

    return DocInfo(
        index=int(idx),
        doc_type=doc_type,
        name=name,
        split=int(split) if split else None,
        status=status,
        date_created=fm.get("datecreated") or fm.get("date_created") or fm.get("date-created"),
        date_updated=fm.get("dateupdated") or fm.get("date_updated") or fm.get("date-updated"),
        project=fm.get("project"),
        parent=fm.get("parent"),
        task_items=items,
        path=path,
    )


def scan_directory(user_dir: Path) -> list[DocInfo]:
    docs: list[DocInfo] = []
    for sub in ("foundation", "architecture", "slices", "tasks", "features", "operational"):
        d = user_dir / sub
        if d.is_dir():
            for f in sorted(d.iterdir()):
                if f.suffix == ".md":
                    info = parse_file(f)
                    if info:
                        docs.append(info)
    return docs


# ── Model builder ────────────────────────────────────────────────

def _d(doc: DocInfo) -> dict[str, Any]:
    """Minimal dict for a document entry."""
    entry: dict[str, Any] = {
        "index": str(doc.index).zfill(3),
        "name": doc.name,
        "status": doc.status,
    }
    if doc.date_created:
        entry["dateCreated"] = doc.date_created
    if doc.date_updated:
        entry["dateUpdated"] = doc.date_updated
    if doc.doc_type:
        entry["type"] = doc.doc_type
    return entry


def _task_entry(task_docs: list[DocInfo]) -> dict[str, Any]:
    """Merge potentially split task files into one entry."""
    task_docs = sorted(task_docs, key=lambda d: (d.index, d.split or 0))
    td0 = task_docs[0]
    all_items: list[dict[str, Any]] = []
    for td in task_docs:
        all_items.extend(td.task_items)

    total = len(all_items)
    completed = sum(1 for it in all_items if it["done"])

    entry: dict[str, Any] = {
        "index": str(td0.index).zfill(3),
        "name": f"tasks.{td0.name}",
        "status": td0.status,
        "taskCount": total,
        "completedTasks": completed,
    }
    if td0.date_created:
        entry["dateCreated"] = td0.date_created
    if td0.date_updated:
        entry["dateUpdated"] = td0.date_updated
    if all_items:
        entry["items"] = all_items

    # Infer status from checkbox state when frontmatter is ambiguous
    if total > 0 and entry["status"] == "not-started":
        if completed == total:
            entry["status"] = "complete"
        elif completed > 0:
            entry["status"] = "in-progress"

    return entry


def build_model(
    user_dir: Path,
    project_name: str | None = None,
    project_description: str = "",
) -> dict[str, Any]:
    """Build the complete project model from a user/ directory."""
    docs = scan_directory(user_dir)

    # Group by type
    by_type: dict[str, list[DocInfo]] = {}
    for d in docs:
        by_type.setdefault(d.doc_type, []).append(d)

    # ------------------------------------------------------------------
    # Foundation (000-009)
    # ------------------------------------------------------------------
    foundation = [
        _d(d)
        for d in docs
        if d.index < 10 and d.doc_type in ("concept", "spec", "hld", "slices")
    ]

    # ------------------------------------------------------------------
    # Project Architecture (050-099)
    # ------------------------------------------------------------------
    project_arch = []
    for d in docs:
        if 50 <= d.index <= 99 and d.doc_type in ("hld", "arch"):
            e = _d(d)
            project_arch.append(e)

    # ------------------------------------------------------------------
    # Initiatives (100-799)
    # ------------------------------------------------------------------
    # Detect initiative bands from arch or slices docs
    bases: set[int] = set()
    for d in docs:
        if 100 <= d.index <= 799 and d.doc_type in ("arch", "slices"):
            bases.add(d.index)

    # Build index of (index, type) -> [docs] for quick lookup
    by_it: dict[tuple[int, str], list[DocInfo]] = {}
    for d in docs:
        by_it.setdefault((d.index, d.doc_type), []).append(d)

    initiatives: dict[int, dict[str, Any]] = {}
    for base in sorted(bases):
        # Determine initiative name
        arch_doc = next(
            (d for d in by_it.get((base, "arch"), [])), None
        )
        slices_doc = next(
            (d for d in by_it.get((base, "slices"), [])), None
        )
        name = (arch_doc or slices_doc).name.replace("-", " ").replace("_", " ").title() if (arch_doc or slices_doc) else f"Initiative {base}"

        # Determine upper bound (next base or 800)
        higher = [b for b in bases if b > base]
        upper = min(higher) if higher else 800

        # Gather slices in this band
        init_slices: list[dict[str, Any]] = []
        for d in by_type.get("slice", []):
            if base <= d.index < upper:
                sl = _d(d)

                # Matching task file(s)
                task_docs = by_it.get((d.index, "tasks"), [])
                if task_docs:
                    sl["tasks"] = _task_entry(task_docs)

                # Features/issues at this index
                feats = [
                    _d(fd)
                    for fd in by_it.get((d.index, "feature"), [])
                    + by_it.get((d.index, "issue"), [])
                ]
                if feats:
                    sl["features"] = feats

                init_slices.append(sl)

        init_slices.sort(key=lambda x: int(x["index"]))

        init: dict[str, Any] = {"name": name, "slices": init_slices, "features": []}
        if arch_doc:
            init["arch"] = _d(arch_doc)
        if slices_doc:
            sp = _d(slices_doc)
            sp["futureWork"] = []
            init["slicePlan"] = sp

        initiatives[base] = init

    # ------------------------------------------------------------------
    # Standalone features/issues (not claimed by a slice index)
    # These are distinct from "future slices" — they're feature requests
    # and issues with optional task breakdowns.
    # ------------------------------------------------------------------
    claimed: set[int] = {
        int(sl["index"]) for init in initiatives.values() for sl in init["slices"]
    }

    standalone_features: list[dict[str, Any]] = []
    for d in by_type.get("feature", []) + by_type.get("issue", []):
        if 100 <= d.index <= 799 and d.index not in claimed:
            e = _d(d)
            e["docType"] = d.doc_type  # "feature" or "issue"
            # Associate with nearest initiative base
            for base in sorted(initiatives.keys(), reverse=True):
                if d.index >= base:
                    e["parent"] = str(base)
                    break
            # Attach task files if they exist
            task_docs = by_it.get((d.index, "tasks"), [])
            if task_docs:
                e["tasks"] = _task_entry(task_docs)
            standalone_features.append(e)

    # Future slices are reserved for explicitly future-marked items
    # (currently empty — will be populated when future slice docs exist)
    future_slices: list[dict[str, Any]] = []

    # ------------------------------------------------------------------
    # Operational (900+)
    # ------------------------------------------------------------------
    quality = [_d(d) for d in by_type.get("review", []) if d.index >= 900]
    investigation = [_d(d) for d in by_type.get("analysis", [])]

    maintenance: list[dict[str, Any]] = []
    for d in by_type.get("tasks", []):
        if d.index >= 900:
            e = _d(d)
            if d.task_items:
                e["taskCount"] = len(d.task_items)
                e["completedTasks"] = sum(1 for it in d.task_items if it["done"])
            maintenance.append(e)

    # ------------------------------------------------------------------
    # DEVLOG
    # ------------------------------------------------------------------
    project_root = user_dir.parent.parent
    has_devlog = (project_root / "DEVLOG.md").exists()

    # ------------------------------------------------------------------
    # Assemble
    # ------------------------------------------------------------------
    return {
        "name": (project_name or "Unknown").replace("-", " ").replace("_", " ").title(),
        "description": project_description,
        "foundation": foundation,
        "projectArchitecture": project_arch,
        "initiatives": {str(k): v for k, v in sorted(initiatives.items())},
        "futureSlices": future_slices,
        "standaloneFeatures": standalone_features,
        "quality": quality,
        "investigation": investigation,
        "maintenance": maintenance,
        "devlog": has_devlog,
    }


# ============================================================================
# CLI
# ============================================================================


def find_user_dir(path: Path) -> Path | None:
    """Locate the user/ directory under project-documents/."""
    candidates = [
        path / "project-documents" / "user",
        path / "user",
        path,
    ]
    for c in candidates:
        if c.is_dir() and any(
            sub.is_dir() for sub in c.iterdir() if sub.name in ("foundation", "architecture", "slices", "tasks")
        ):
            return c
    return None


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Parse ai-project-guide structure to JSON")
    parser.add_argument("projects", nargs="+", help="Path(s) to project root(s)")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    parser.add_argument("--name", help="Override project name (single project only)")
    args = parser.parse_args()

    result: dict[str, Any] = {}
    for proj_path in args.projects:
        p = Path(proj_path).resolve()
        user_dir = find_user_dir(p)
        if not user_dir:
            print(f"⚠ Skipping {p}: no user/ directory found", file=sys.stderr)
            continue
        name = args.name if (args.name and len(args.projects) == 1) else p.name
        model = build_model(user_dir, project_name=name)
        key = p.name.lower().replace(" ", "-")
        result[key] = model

    indent = 2 if args.pretty else None
    out = json.dumps(result, indent=indent, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(out, encoding="utf-8")
        print(f"✓ Written to {args.output}", file=sys.stderr)
    else:
        print(out)


if __name__ == "__main__":
    main()
