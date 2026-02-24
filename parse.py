#!/usr/bin/env python3
"""
ai-project-guide structure parser

Scans a project's `project-documents/user/` directory, extracts document
metadata from filenames and YAML frontmatter, parses task checkboxes,
and outputs the JSON model consumed by the project-structure-viz component.

Usage:
    python parse_project.py /path/to/project-root
    python parse_project.py /path/to/project-root --pretty
    python parse_project.py /path/to/project-root -o output.json

    # Multiple projects:
    python parse_project.py /path/to/project1 /path/to/project2 --pretty

    # Override project name:
    python parse_project.py /path/to/project --name "My Project"
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ============================================================================
# FILENAME PATTERNS — from file-naming-conventions.md
# ============================================================================

# NNN-type.name[-split].md
INDEXED_RE = re.compile(
    r"^(\d{3})-"
    r"(arch|slices|slice|tasks|feature|issue|review|analysis|concept|spec|hld)"
    r"\."
    r"(.+?)"
    r"(?:-(\d+))?"
    r"\.md$",
    re.IGNORECASE,
)

# Fallback for project-guides
GUIDE_RE = re.compile(
    r"^(\d{3})-(concept|spec|hld|slices|guide)\.(.+?)\.md$",
    re.IGNORECASE,
)

# ============================================================================
# FRONTMATTER — lightweight parser, no PyYAML required
# ============================================================================


def parse_frontmatter(filepath: Path) -> dict[str, str]:
    """Extract YAML frontmatter as flat key:value dict."""
    result: dict[str, str] = {}
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            if f.readline().strip() != "---":
                return result
            for line in f:
                stripped = line.strip()
                if stripped == "---":
                    break
                if ":" in stripped:
                    key, _, val = stripped.partition(":")
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if val:
                        result[key] = val
    except (OSError, UnicodeDecodeError):
        pass
    return result


# ============================================================================
# TASK CHECKBOXES
# ============================================================================

CHECKBOX_RE = re.compile(r"^(?:\s*)-\s+\[([ xX])\]\s+(.+)$")


def parse_task_items(filepath: Path) -> list[dict[str, Any]]:
    """Extract `- [x] name` / `- [ ] name` items from a task file."""
    items: list[dict[str, Any]] = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                m = CHECKBOX_RE.match(line)
                if m:
                    name = m.group(2).strip()
                    if len(name) > 120:
                        name = name[:117] + "..."
                    items.append({"name": name, "done": m.group(1).lower() == "x"})
    except (OSError, UnicodeDecodeError):
        pass
    return items


# ============================================================================
# STATUS NORMALIZATION
# ============================================================================

_STATUS = {
    "complete": "complete", "completed": "complete", "done": "complete",
    "in_progress": "in-progress", "in-progress": "in-progress",
    "in progress": "in-progress", "active": "in-progress",
    "not_started": "not-started", "not-started": "not-started",
    "not started": "not-started", "ready": "not-started",
    "pending": "not-started", "planned": "not-started",
    "deprecated": "deprecated",
}


def norm_status(raw: str | None) -> str:
    return _STATUS.get((raw or "").lower().strip(), "not-started")


# ============================================================================
# DOCUMENT REGISTRY
# ============================================================================


@dataclass
class Doc:
    index: int
    doc_type: str
    name: str
    filename: str
    filepath: Path
    status: str = "not-started"
    date_created: str | None = None
    date_updated: str | None = None
    project: str | None = None
    parent: str | None = None
    description: str | None = None
    task_items: list[dict[str, Any]] = field(default_factory=list)
    split_num: int | None = None


def scan_directory(user_dir: Path) -> list[Doc]:
    """Walk subdirectories of user/ and collect document metadata."""
    docs: list[Doc] = []

    for subdir_name in (
        "architecture", "slices", "tasks", "features",
        "project-guides", "reviews", "analysis", "maintenance",
    ):
        subdir = user_dir / subdir_name
        if not subdir.is_dir():
            continue

        for fp in sorted(subdir.iterdir()):
            if not fp.is_file() or not fp.name.endswith(".md"):
                continue

            m = INDEXED_RE.match(fp.name) or GUIDE_RE.match(fp.name)
            if not m:
                continue

            groups = m.groups()
            idx = int(groups[0])
            doc_type = groups[1].lower()
            name = groups[2]
            split_num = int(groups[3]) if len(groups) > 3 and groups[3] else None

            fm = parse_frontmatter(fp)

            doc = Doc(
                index=idx, doc_type=doc_type, name=name,
                filename=fp.name, filepath=fp,
                status=norm_status(fm.get("status")),
                date_created=fm.get("dateCreated"),
                date_updated=fm.get("dateUpdated"),
                project=fm.get("project"),
                parent=fm.get("parent"),
                description=fm.get("description"),
                split_num=split_num,
            )

            if doc_type == "tasks":
                doc.task_items = parse_task_items(fp)

            docs.append(doc)

    return docs


# ============================================================================
# MODEL BUILDER
# ============================================================================


def _d(doc: Doc) -> dict[str, Any]:
    """Doc → visualizer block dict."""
    d: dict[str, Any] = {
        "index": f"{doc.index:03d}",
        "name": doc.name,
        "status": doc.status,
    }
    if doc.date_created:
        d["dateCreated"] = doc.date_created
    if doc.date_updated:
        d["dateUpdated"] = doc.date_updated
    return d


def _task_entry(task_docs: list[Doc]) -> dict[str, Any]:
    """Merge split task docs into a single task entry."""
    all_items: list[dict[str, Any]] = []
    for td in sorted(task_docs, key=lambda t: t.split_num or 0):
        all_items.extend(td.task_items)

    completed = sum(1 for it in all_items if it["done"])
    total = len(all_items)
    td0 = task_docs[0]

    entry: dict[str, Any] = {
        "index": f"{td0.index:03d}",
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

    # Infer project name from frontmatter or directory name
    if not project_name:
        for d in docs:
            if d.project:
                project_name = d.project
                break
    if not project_name:
        project_name = user_dir.parent.parent.name

    # Group by type and by (index, type)
    by_type: dict[str, list[Doc]] = {}
    by_it: dict[tuple[int, str], list[Doc]] = {}
    for d in docs:
        by_type.setdefault(d.doc_type, []).append(d)
        by_it.setdefault((d.index, d.doc_type), []).append(d)

    # ------------------------------------------------------------------
    # Foundation (000-009)
    # ------------------------------------------------------------------
    foundation: list[dict[str, Any]] = []
    for dt in ("concept", "spec", "hld", "slices"):
        for d in by_type.get(dt, []):
            if d.index <= 9:
                e = _d(d)
                e["type"] = dt
                foundation.append(e)
    foundation.sort(key=lambda x: (int(x["index"]), x.get("type", "")))

    # ------------------------------------------------------------------
    # Project-level architecture (050-099)
    # ------------------------------------------------------------------
    project_arch: list[dict[str, Any]] = []
    for d in by_type.get("arch", []) + by_type.get("hld", []):
        if 50 <= d.index <= 99:
            e = _d(d)
            e["type"] = "hld" if ("hld" in d.name.lower() or d.doc_type == "hld") else "arch"
            project_arch.append(e)
    project_arch.sort(key=lambda x: int(x["index"]))

    # ------------------------------------------------------------------
    # Initiative bands (100-799)
    #
    # An initiative exists where there's an arch or slices doc.
    # Slices attach to the nearest initiative base <= their index
    # and < the next initiative base. Unmatched slices are skipped.
    # ------------------------------------------------------------------
    bases: set[int] = set()
    for d in by_type.get("arch", []):
        if 100 <= d.index <= 799:
            bases.add(d.index)
    for d in by_type.get("slices", []):
        if 100 <= d.index <= 799:
            bases.add(d.index)

    sorted_bases = sorted(bases)
    initiatives: dict[int, dict[str, Any]] = {}

    for bi, base in enumerate(sorted_bases):
        upper = sorted_bases[bi + 1] if bi + 1 < len(sorted_bases) else 800

        arch_doc = next(iter(by_it.get((base, "arch"), [])), None)
        slices_doc = next(iter(by_it.get((base, "slices"), [])), None)

        # Name from arch or slice plan
        raw_name = ""
        if arch_doc:
            raw_name = arch_doc.name
        elif slices_doc:
            raw_name = slices_doc.name
        name = raw_name.replace("-", " ").replace(".", " ").strip().title()

        # Collect slices in [base, upper)
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
    # Standalone features (not claimed by a slice index)
    # ------------------------------------------------------------------
    claimed: set[int] = {
        int(sl["index"]) for init in initiatives.values() for sl in init["slices"]
    }

    future_slices: list[dict[str, Any]] = []
    for d in by_type.get("feature", []) + by_type.get("issue", []):
        if 100 <= d.index <= 799 and d.index not in claimed:
            e = _d(d)
            # Associate with nearest initiative base
            for base in sorted(initiatives.keys(), reverse=True):
                if d.index >= base:
                    e["parent"] = str(base)
                    break
            future_slices.append(e)

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
        "quality": quality,
        "investigation": investigation,
        "maintenance": maintenance,
        "devlog": has_devlog,
    }


# ============================================================================
# CLI
# ============================================================================


def find_user_dir(path: Path) -> Path | None:
    """Locate project-documents/user/ from a project root or nearby."""
    for c in (
        path / "project-documents" / "user",
        path / "user",
        path,
    ):
        if c.is_dir() and any(
            (c / s).is_dir() for s in ("architecture", "slices", "tasks")
        ):
            return c
    return None


def main():
    ap = argparse.ArgumentParser(
        description="Parse ai-project-guide structure → JSON for visualization",
    )
    ap.add_argument("projects", nargs="+", type=Path, help="Project root path(s)")
    ap.add_argument("-o", "--output", type=Path, default=None, help="Output file")
    ap.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    ap.add_argument("--name", type=str, default=None, help="Override project name")
    ap.add_argument("--description", type=str, default="", help="Project description")

    args = ap.parse_args()
    results: dict[str, Any] = {}

    for pp in args.projects:
        pp = pp.resolve()
        ud = find_user_dir(pp)
        if not ud:
            print(f"Error: No project-documents/user/ in {pp}", file=sys.stderr)
            sys.exit(1)

        nm = args.name if len(args.projects) == 1 else None
        model = build_model(ud, nm, args.description)
        key = pp.name.lower().replace(" ", "-")
        results[key] = model

    out = json.dumps(results, indent=2 if args.pretty else None, ensure_ascii=False)

    if args.output:
        args.output.write_text(out, encoding="utf-8")
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        print(out)


if __name__ == "__main__":
    main()
