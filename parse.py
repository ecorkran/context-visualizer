#!/usr/bin/env python3
"""
ai-project-guide structure parser

Scans a project's `project-documents/user/` directory, extracts document
metadata from filenames and YAML frontmatter, parses task checkboxes,
and outputs the JSON model consumed by the project-structure-viz component.

Usage:
    # Default: write per-project JSON to projects/ and update manifest
    python parse.py /path/to/project-root
    python parse.py /path/to/project-root --pretty
    python parse.py /path/to/project1 /path/to/project2

    # Explicit output file (no manifest update):
    python parse.py /path/to/project-root -o output.json

    # Custom output directory:
    python parse.py /path/to/project-root --projects-dir /tmp/out

    # Override project name:
    python parse.py /path/to/project --name "My Project"
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

# Numbered list items in sections: "N. [ ] ..." or "N. [ ] **(NNN) Name** ..."
_FW_ITEM_RE = re.compile(r"^\d+\.\s+\[([ xX])\]\s+(.+)$")
_FW_INDEX_RE = re.compile(r"^\((\d+)\)\s*")
# Plan slice entries: "N. [ ] **(NNN) Name** — ..."  (bold index distinguishes from future work)
_PLAN_SLICE_RE = re.compile(r"^\d+\.\s+\[([ xX])\]\s+\*\*\((\d+)\)\s+(.+?)\*\*")

# Headings that do NOT contain slice entries in a slice plan
_NON_SLICE_HEADINGS = {"future work", "implementation order", "notes", "parent document"}


def _fw_title(text: str) -> str:
    """Extract short title from a future work item (text before em-dash or colon)."""
    for sep in (" — ", ": "):
        pos = text.find(sep)
        if pos > 0:
            return text[:pos].strip()
    return text


def parse_plan_slices(filepath: Path) -> list[dict[str, Any]]:
    """Extract planned slice entries from a slice plan document.

    Matches numbered list items of the form:
        N. [ ] **(NNN) Slice Name** — description...
    The bold ``**(NNN)``  pattern distinguishes slice entries from future work items.
    """
    items: list[dict[str, Any]] = []
    in_slice_section = True  # Assume slice sections until a non-slice heading
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                stripped = line.strip()
                if re.match(r"^#{1,3}\s+", stripped):
                    heading = stripped.lstrip("#").strip().lower()
                    in_slice_section = not any(ns in heading for ns in _NON_SLICE_HEADINGS)
                    continue
                if not in_slice_section:
                    continue
                m = _PLAN_SLICE_RE.match(stripped)
                if not m:
                    continue
                done = m.group(1).lower() == "x"
                index = int(m.group(2))
                name = m.group(3).strip()
                items.append({
                    "index": index,
                    "name": name,
                    "status": "complete" if done else "not-started",
                })
    except (OSError, UnicodeDecodeError):
        pass
    return items


def parse_future_work(filepath: Path, next_index: int = 0) -> list[dict[str, Any]]:
    """Extract numbered items from the '## Future Work' section of a slice plan.

    Items with an explicit ``(NNN)`` index use that index.  Unnumbered items
    are assigned sequential indices starting at ``next_index``.
    """
    items: list[dict[str, Any]] = []
    in_section = False
    auto_idx = next_index
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                stripped = line.strip()
                if re.match(r"^#{1,3}\s+Future Work", stripped, re.IGNORECASE):
                    in_section = True
                    continue
                if in_section and re.match(r"^#{1,3}\s+", stripped):
                    break  # Next heading ends the section
                if not in_section:
                    continue
                m = _FW_ITEM_RE.match(stripped)
                if not m:
                    continue
                done = m.group(1).lower() == "x"
                text = m.group(2).strip()
                # Strip leading " — " that sometimes follows an index like "(781) — Name"
                text = text.lstrip("—").strip()
                # Optional explicit index like "(780) Config System..."
                idx_match = _FW_INDEX_RE.match(text)
                if idx_match:
                    index = idx_match.group(1)
                    text = text[idx_match.end():].strip(" —-")
                else:
                    index = str(auto_idx) if auto_idx > 0 else "?"
                    auto_idx = auto_idx + 1 if auto_idx > 0 else auto_idx
                name = _fw_title(text)
                items.append({"index": index, "name": name, "done": done})
    except (OSError, UnicodeDecodeError):
        pass
    return items


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

        # Collect slices from actual slice files in [base, upper)
        actual_slice_indices: set[int] = set()
        init_slices: list[dict[str, Any]] = []
        for d in by_type.get("slice", []):
            if base <= d.index < upper:
                sl = _d(d)
                actual_slice_indices.add(d.index)

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

        # Fill in planned slices from the slice plan for indices with no actual file
        if slices_doc:
            for ps in parse_plan_slices(slices_doc.filepath):
                if base <= ps["index"] < upper and ps["index"] not in actual_slice_indices:
                    init_slices.append({
                        "index": f"{ps['index']:03d}",
                        "name": ps["name"],
                        "status": ps["status"],
                        "planned": True,
                    })

        init_slices.sort(key=lambda x: int(x["index"]))

        # Compute next auto-index for unnumbered future work items
        last_slice_idx = max(
            (int(sl["index"]) for sl in init_slices), default=base
        )

        init: dict[str, Any] = {"name": name, "slices": init_slices, "features": []}
        if arch_doc:
            init["arch"] = _d(arch_doc)
        if slices_doc:
            sp = _d(slices_doc)
            sp["futureWork"] = parse_future_work(slices_doc.filepath, next_index=last_slice_idx + 1)
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
            # Explicit parent frontmatter takes precedence over nearest-base
            if d.parent and d.parent in {str(k) for k in initiatives}:
                e["parent"] = d.parent
            else:
                # Fall back to nearest initiative base <= d.index
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


def update_manifest(
    projects_dir: Path,
    key: str,
    filename: str,
    source_path: str,
    display_name: str | None = None,
) -> None:
    """Add or update a project entry in manifest.json (merge, don't replace)."""
    manifest_path = projects_dir / "manifest.json"
    manifest: dict[str, Any] = {"projects": []}

    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    entry: dict[str, Any] = {"key": key, "file": filename, "sourcePath": source_path}
    if display_name:
        entry["displayName"] = display_name

    # Replace existing entry for this key, or append
    projects = manifest.get("projects", [])
    replaced = False
    for i, p in enumerate(projects):
        if p.get("key") == key:
            projects[i] = entry
            replaced = True
            break
    if not replaced:
        projects.append(entry)

    manifest["projects"] = projects

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")


def main():
    ap = argparse.ArgumentParser(
        description="Parse ai-project-guide structure → JSON for visualization",
    )
    ap.add_argument("projects", nargs="+", type=Path, help="Project root path(s)")
    ap.add_argument("-o", "--output", type=Path, default=None, help="Output file")
    ap.add_argument(
        "--projects-dir",
        type=Path,
        default=None,
        help="Output directory for project JSON files (default: projects/)",
    )
    ap.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    ap.add_argument("--name", type=str, default=None, help="Override project name")
    ap.add_argument("--description", type=str, default="", help="Project description")

    args = ap.parse_args()
    indent = 2 if args.pretty else None

    # Explicit -o mode: bundle all projects into one file, no manifest update
    if args.output:
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

        out = json.dumps(results, indent=indent, ensure_ascii=False)
        args.output.write_text(out + "\n", encoding="utf-8")
        print(f"Written to {args.output}", file=sys.stderr)
        return

    # Default mode: write per-project JSON to projects/ dir and update manifest
    projects_dir = args.projects_dir or Path("projects")
    projects_dir.mkdir(parents=True, exist_ok=True)

    for pp in args.projects:
        pp = pp.resolve()
        ud = find_user_dir(pp)
        if not ud:
            print(f"Error: No project-documents/user/ in {pp}", file=sys.stderr)
            sys.exit(1)

        nm = args.name if len(args.projects) == 1 else None
        model = build_model(ud, nm, args.description)
        key = pp.name.lower().replace(" ", "-")
        filename = f"{key}-structure.json"
        filepath = projects_dir / filename

        out = json.dumps({key: model}, indent=indent, ensure_ascii=False)
        filepath.write_text(out + "\n", encoding="utf-8")
        print(f"Written to {filepath}", file=sys.stderr)

        update_manifest(projects_dir, key, filename, str(pp), display_name=model["name"])


if __name__ == "__main__":
    main()
