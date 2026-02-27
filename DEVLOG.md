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

###### Slice 101: Refresh Mechanism — Implementation Complete

**Commits:**
- `cc580b7` feat: add serve.py local server with static file serving
- `ea1505d` feat: add /api/refresh endpoint and GET 405 guard to serve.py
- `5d5cb21` test: add unit and integration tests for serve.py
- `481d6c2` feat: expose loadProjects as window.__loadProjects for component refresh
- `d79c1da` feat: add refresh button UI with idle/refreshing/error states
- `735f25e` feat: wire refresh button to /api/refresh and live data reload

**What was delivered:**
- `serve.py` — stdlib-only HTTP server replacing `python -m http.server`; serves static files and exposes `POST /api/refresh`
- `/api/refresh` reads `projects/manifest.json`, invokes `parse.py` via `subprocess.run()` for each project, returns `{"status": "ok", "projects": [...]}` or `{"status": "error", "message": "..."}`; GET returns 405
- `index.html` `loadProjects()` extracted as reusable function and exposed as `window.__loadProjects`; `cache: 'no-store'` added to all project JSON fetches to bypass browser cache after refresh
- Refresh button (↻) added to JSX tab bar: three states (idle / spinning / red error flash), wired to `POST /api/refresh` → re-fetch via `window.__loadProjects()` → React state update; active tab preserved
- 10 unit/integration tests added for serve.py (static serving, refresh endpoint, error cases)

**Notable issue:** Browser cache caused re-fetched JSON to return stale data after a successful parse. Fixed by adding `{ cache: 'no-store' }` to all `fetch()` calls in `loadProjects()`.

**Initiative 100 complete.** Both slices delivered. `python serve.py` is now the local development command.

## 20260226

###### Bug Fixes — parse.py and JSX visualizer

**Commits:**
- `b809b2f` fix: futureWork parsing, plan slice extraction, feature parent attribution
- `48ca388` fix: move DocBlock click handler to header row only

**What was fixed:**
- `parse.py`: futureWork items now extract title-only names (before em-dash separator), plan slices distinguished from future work by bold `**(NNN)**` pattern, feature parent attribution respects explicit `parent` frontmatter
- `project-structure-viz.jsx`: clicking a non-expandable item (e.g., future work entry inside an expanded PLAN block) no longer collapses the parent — onClick moved from outer wrapper div to header row div

###### Initiative 105: Project Management — Slice 105 Design Complete

**Document created:**
- `user/slices/105-slice.project-management-api.md` — Slice design for the catalog management API

**Scope:** Extend manifest with `displayName`, add `GET /api/projects`, `POST /api/projects`, `DELETE /api/projects/{key}` to `serve.py`. No UI changes — backend only. Panel UI deferred to slice 106.

**Key decisions:**
- `displayName` sourced from `model["name"]` in `build_model()`, written by `update_manifest()`
- DELETE removes both manifest entry and JSON file (JSON is a derived artifact, regenerable by re-adding)
- POST is idempotent — re-adding an existing project re-parses and updates
- Path validation reuses `find_user_dir()` from `parse.py`

**Next:** Task breakdown for slice 105 (Phase 5), then implementation.

###### Slice 105: Project Management API — Implementation Complete

**Commits:**
- `85869aa` feat: add displayName to update_manifest() and main() call site
- `389b06c` test: add displayName manifest tests to test_parse.py
- `6a478b5` feat: add GET /api/projects, POST /api/projects, DELETE /api/projects/{key}
- `3d48eab` test: add project management endpoint tests; fix POST --projects-dir arg
- `b686795` chore: backfill displayName into manifest entries
- `783a137` docs: mark slice 105 complete in slice design, slice plan, and task file

**What was delivered:**
- `parse.py` — `update_manifest()` accepts optional `display_name` parameter; `main()` passes `model["name"]`; all existing callers backward compatible
- `serve.py` — `GET /api/projects` reads and returns manifest entries; `POST /api/projects` validates path, invokes parser via subprocess with `--projects-dir`, returns new entry; `DELETE /api/projects/{key}` removes manifest entry and deletes derived JSON file; `do_DELETE` added; `_manifest_path()` and `_parse_py()` helpers enable test isolation
- `projects/manifest.json` — backfilled `displayName` for `context-forge` and `orchestration`
- 5 new tests in `test_parse.py` (unit-level `displayName` assertions); 15 new tests in `test_serve.py` (GET, POST, DELETE — happy paths, error cases, idempotent re-add, missing-file graceful handling); 52 total tests passing

**Notable fix:** `POST /api/projects` subprocess call originally omitted `--projects-dir`, causing JSON and manifest writes to land in the repo's `projects/` rather than the test's temp dir. Fixed by passing `--projects-dir` derived from `_manifest_path().parent`.
