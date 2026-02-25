# DEVLOG — context-visualizer

## 20260224

###### Initiative 100: File Updates and Organization — Design Complete

**Documents created:**
- `user/project-guides/001-concept.context-visualizer.md` — Refined concept document (full vision scope, static-first approach, no standalone spec — using architectural components instead)
- `user/architecture/100-arch.file-updates-and-organization.md` — Architecture component: data/presentation separation, structured storage, refresh mechanism
- `user/architecture/100-slices.file-updates-and-organization.md` — Slice plan: 2 slices (Data Externalization, Refresh Mechanism)
- `user/slices/100-slice.data-externalization.md` — Slice design: external JSON in `projects/`, manifest-based discovery, parser output updates, boot sequence changes
- `user/slices/101-slice.refresh-mechanism.md` — Slice design: `serve.py` stdlib server, `/api/refresh` endpoint, refresh button UI
- `user/tasks/100-tasks.data-externalization.md` — Task breakdown: 7 tasks
- `user/tasks/101-tasks.refresh-mechanism.md` — Task breakdown: 7 tasks

**Key design decisions:**
- Manifest file (`projects/manifest.json`) chosen over directory listing or convention-based enumeration for project discovery
- `serve.py` extends stdlib `http.server` (zero dependencies) rather than introducing Flask/FastAPI
- Manifest includes `sourcePath` per project so the refresh server knows where to re-parse from
- `parse_project.py` (older, superseded parser) was deleted — `parse.py` is the single parser going forward

**Scope summary:**
Initiative 100 covers migrating inline project data out of the JSX component into external JSON files, updating the parser to write to a `projects/` directory by default, and adding a refresh button that triggers re-parse from the browser. Two sequential slices: Data Externalization (no dependencies) then Refresh Mechanism (depends on first).

**Notable findings:**
- `parse.py` and `parse_project.py` had overlapping functionality. `parse.py` was newer and more complete (correct directory scanning, dual regex patterns, richer metadata). Resolved by deleting `parse_project.py`.
- Cross-slice refinement identified: Data Externalization manifest format needs `sourcePath` field for Refresh Mechanism. Documented in both slice designs.

**Next:** Implementation of slice 100 (Data Externalization), starting with Task 1: create `projects/` directory and move existing JSON files.

## 20260225

###### Slice 100: Data Externalization — Implementation Complete

**Commits:**
- `d907bee` feat: create projects/ directory and move JSON files
- `62c1bf9` feat: create projects/manifest.json for project discovery
- `5775702` feat: update parse.py to write per-project JSON to projects/ by default
- `2c97780` test: add unit and integration tests for parse.py output modes
- `19ea0a9` chore: add Python cache to .gitignore and remove tracked pycache
- `b6db457` docs: check off Task 4 in 100-tasks.data-externalization
- `68a16b0` feat: update index.html boot sequence to load projects from manifest
- `ca1bba7` feat: remove inline data from JSX and reference external PROJECTS global
- `59f00c2` fix: remove PROJECTS from new Function params to avoid redeclaration

**What was delivered:**
- `projects/` directory with per-project JSON files and `manifest.json` for discovery
- `parse.py` now writes to `projects/` by default, updates manifest with `sourcePath`; `-o` flag and `--projects-dir` flag preserved
- `index.html` `boot()` refactored: fetches manifest → fetches each project JSON → assembles `PROJECTS` global before mounting component
- `project-structure-viz.jsx` reduced from ~8,200 to 687 lines — all inline JSON removed, reads `window.__PROJECTS` instead
- 13 unit/integration tests added for parser output modes

**Notable issue:** `PROJECTS` was declared both as a `new Function` parameter and as `const PROJECTS = window.__PROJECTS` in the JSX — duplicate identifier error. Fixed by removing the parameter and letting the JSX read directly from `window.__PROJECTS`.

**Next:** Slice 101 — Refresh Mechanism (`serve.py` local server + refresh button UI).
