---
docType: tasks
slice: local-project-discovery
project: context-visualizer
lld: user/slices/122-slice.local-project-discovery.md
dependencies: [120-project-management-api, 121-project-panel-ui]
projectState: Slices 120 and 121 complete — serve.py has GET/POST/DELETE /api/projects, ProjectPanel with add/remove/refresh; 55 tests passing. Slice 122 design finalized (commit e9f9f3b).
status: complete
dateCreated: 20260228
dateUpdated: 20260228
---

## Context Summary

- Working on slice 122: Local Project Discovery
- Adds a "Find projects" collapsible section to `ProjectPanel` (below existing Add input)
- Two new GET endpoints: `GET /api/info` (smart scan root), `GET /api/discover?root=<path>` (depth-1 scan)
- No new Python dependencies (stdlib only: `urllib.parse`, `os.path`)
- All changes in `serve.py` and `project-structure-viz.jsx` — no new files
- E2E tests via pytest-playwright (`live_server` fixture in `tests/conftest.py`)
- Key files: `serve.py`, `project-structure-viz.jsx`, `tests/test_serve.py`, `tests/test_ui_smoke.py`

---

## Tasks

### 1. Add `GET /api/info` endpoint to `serve.py`

- [x] Add `_handle_info` method to the `Handler` class:
  - Read manifest via `_read_manifest()`
  - Collect all `sourcePath` values from `manifest.get("projects", [])`
  - Compute `scanRoot`:
    - 2+ projects: `os.path.commonpath(source_paths)` — but only if it is a directory (not just a common prefix of filenames); wrap in `Path(...).parent` if the result is not a real directory
    - 1 project: `str(Path(source_path).parent)`
    - 0 projects or manifest error: `str(Path.home())`
  - Return `200` with `{ "status": "ok", "scanRoot": "<path>" }` — always 200, never error
- [x] Wire into `do_GET`: add `elif self.path == "/api/info":` branch calling `self._handle_info()`
- [x] Add `import os` at the top if not already present (needed for `os.path.commonpath`)
- [x] Commit: `feat: add GET /api/info endpoint for smart scan root`

**Success criteria:**
- [x] `GET /api/info` returns 200 with `scanRoot` when manifest has projects
- [x] Returns home directory when manifest is empty or missing
- [x] No new imports outside stdlib

---

### 2. Tests for `GET /api/info`

- [x] In `tests/test_serve.py`, add test cases for `GET /api/info`:
  - `test_info_no_projects` — empty manifest → scanRoot is `str(Path.home())`
  - `test_info_one_project` — single project at `/a/b/c` → scanRoot is `/a/b`
  - `test_info_two_projects_common_parent` — projects at `/a/b/proj1` and `/a/b/proj2` → scanRoot is `/a/b`
  - `test_info_manifest_missing` — no manifest file → scanRoot is `str(Path.home())`
- [x] Run `pytest tests/test_serve.py -k info` — all pass
- [x] Commit: `test: add tests for GET /api/info`

**Success criteria:**
- [x] All 4 test cases pass
- [x] No existing tests broken

---

### 3. Add `GET /api/discover` endpoint to `serve.py`

- [x] Add `_handle_discover` method to the `Handler` class:
  - Parse query string from `self.path` using `urllib.parse.urlparse` and `parse_qs`:
    ```python
    from urllib.parse import urlparse, parse_qs
    qs = parse_qs(urlparse(self.path).query)
    root = qs.get("root", [None])[0]
    ```
  - Validate `root` param:
    - Missing → 400 `{ "status": "error", "message": "Missing required parameter: root" }`
    - Path doesn't exist → 400 `{ "status": "error", "message": "Path does not exist: <root>" }`
    - Not a directory → 400 `{ "status": "error", "message": "Not a directory: <root>" }`
  - Enumerate immediate children: `Path(root).iterdir()` — no recursion
  - For each child that is a directory: call `find_user_dir(child)`; include child if non-None
  - For each valid candidate: extract `displayName` via `build_model(user_dir).get("name", child.name)`
  - Sort candidates by `displayName`, cap at 30
  - Return `200` with `{ "status": "ok", "candidates": [...] }`
- [x] Import `build_model` from `parse` alongside existing `find_user_dir` import (it is already importable via the same `sys.path.insert` pattern in `_handle_add_project`)
  - Note: import `find_user_dir` and `build_model` at the top of `_handle_discover`, following the pattern in `_handle_add_project`
- [x] Wire into `do_GET`: match on `self.path.startswith("/api/discover")` (before the static fallback)
- [x] Commit: `feat: add GET /api/discover endpoint for depth-1 project scan`

**Success criteria:**
- [x] `GET /api/discover?root=<valid-dir>` returns 200 with candidates list
- [x] `GET /api/discover?root=<nonexistent>` returns 400
- [x] `GET /api/discover` (missing root) returns 400
- [x] Results sorted by displayName; max 30 entries

---

### 4. Tests for `GET /api/discover`

- [x] In `tests/test_serve.py`, add test cases for `GET /api/discover`:
  - `test_discover_missing_root` — no `root` param → 400 error
  - `test_discover_nonexistent_path` — `root` doesn't exist → 400 error
  - `test_discover_not_a_directory` — `root` is a file → 400 error
  - `test_discover_empty_dir` — valid dir with no valid project children → 200, empty candidates list
  - `test_discover_finds_candidates` — valid dir containing at least one child with `project-documents/user/` → 200, candidate present with correct `path` and `displayName`
  - `test_discover_excludes_non_projects` — directories without `project-documents/user/` are not returned
- [x] Use `tmp_path` pytest fixture to create temporary directory structures
- [x] Run `pytest tests/test_serve.py -k discover` — all pass
- [x] Run `pytest tests/` — full suite passes (no regressions)
- [x] Commit: `test: add tests for GET /api/discover`

**Success criteria:**
- [x] All 6 test cases pass
- [x] Full test suite passes

---

### 5. "Find projects" toggle in `ProjectPanel`

- [x] Add local state to `ProjectPanel` (in `project-structure-viz.jsx`):
  ```js
  const [showDiscover, setShowDiscover] = useState(false);
  const [scanRoot, setScanRoot] = useState('');
  const [scanState, setScanState] = useState('idle'); // 'idle'|'scanning'|'done'|'error'
  const [scanResults, setScanResults] = useState([]);
  const [scanError, setScanError] = useState('');
  const [rowAddState, setRowAddState] = useState({}); // { [path]: 'idle'|'adding' }
  ```
- [x] Add `handleToggleDiscover` async function:
  - Toggle `showDiscover`
  - On expand (opening): if `scanRoot` is empty, fetch `GET /api/info` and set `scanRoot` from response `scanRoot`
- [x] Add toggle button below the existing Add input area in expanded panel:
  - Full-width row with label "Find projects" and a `›` (collapsed) or `‹` (expanded) chevron
  - Uses subtle secondary styling (consistent with panel aesthetic)
  - Click calls `handleToggleDiscover`
- [x] Toggle only renders in the expanded panel state (not collapsed strip)
- [x] Commit: `feat: add Find projects toggle to ProjectPanel`

**Success criteria:**
- [x] "Find projects" button visible at bottom of expanded panel
- [x] Clicking it toggles the section open/closed
- [x] On first open, root input is pre-populated from `GET /api/info`
- [x] On subsequent opens (if already populated), input is not overwritten

---

### 6. Root input and Find button

- [x] When `showDiscover` is true, render below the toggle:
  - A row with:
    - Text input bound to `scanRoot` — editable, placeholder "Root directory..."
    - "Find" button — disabled when `scanState === 'scanning'` or `scanRoot.trim()` is empty
- [x] Add `handleFind` async function:
  - Set `scanState` to `'scanning'`, clear `scanResults` and `scanError`
  - `GET /api/discover?root=<encodeURIComponent(scanRoot.trim())>`
  - On success: set `scanResults` to response `candidates`, set `scanState` to `'done'`
  - On error: set `scanError` to response `message`, set `scanState` to `'error'`; auto-clear after 3s (`setScanState('idle')`, `setScanError('')`)
- [x] "Find" button label: "Find" (idle/done), "…" (scanning)
- [x] Commit: `feat: add root input and Find button to discover section`

**Success criteria:**
- [x] Root input and Find button render when section is expanded
- [x] Clicking Find triggers scan; button shows `…` during scan
- [x] Error message appears inline below the input row; auto-clears after 3s
- [x] Find button disabled while scanning or when input is empty

---

### 7. Candidate results list

- [x] When `scanState === 'done'`, render results below the Find button row:
  - Empty state (`scanResults.length === 0`): show "No projects found here" in muted text
  - For each candidate `{ path, displayName }`:
    - Determine if already tracked: check if `candidate.path` matches any `projects[k].sourcePath` value in the `projects` prop (client-side, no fetch needed). Note: `projects` is the PROJECTS object from root state — each entry has `sourcePath` via manifest data.

      ```js
      const trackedPaths = new Set(Object.values(projects).map(p => p.sourcePath).filter(Boolean));
      const isTracked = trackedPaths.has(candidate.path);
      ```

    - Untracked row: `●` indicator, display name, path (small gray), "Add" button
    - Tracked row: `○` indicator (muted), display name, "already added" label (muted), no Add button
    - Per-row Add button spinner: show `…` when `rowAddState[candidate.path] === 'adding'`
- [x] Add `handleRowAdd(path)` async function:
  - Set `rowAddState[path]` to `'adding'`
  - `POST /api/projects { path }`
  - On success: call `onProjectsChanged()` + `onActivate(response.project.key)` + set `rowAddState[path]` back to `'idle'` (row will now appear as tracked)
  - On error: log to console, set `rowAddState[path]` to `'idle'`
- [x] Commit: `feat: render discover results with per-row Add buttons`

**Success criteria:**
- [x] Candidate rows show display name and truncated path
- [x] Already-tracked candidates shown grayed with "already added", no Add button
- [x] Clicking Add on a row adds the project, row transitions to "already added"
- [x] Empty results state shows message
- [x] No console errors during normal operation

---

### 8. Manual E2E verification via Playwright MCP

- [x] Start the dev server: `python serve.py`
- [x] Open app in browser (via Playwright MCP or manually at `http://localhost:8000`)
- [x] Verify the following flows:
  - [x] Expand panel, scroll to bottom — "Find projects" toggle visible
  - [x] Click "Find projects" — section expands, root input pre-populated with a sensible path
  - [x] Edit root to a directory containing valid project siblings, click "Find" — results list appears
  - [x] Already-tracked projects appear grayed with "already added"
  - [x] Click Add on an untracked candidate — project appears in panel list and row becomes "already added"
  - [x] Click "Find projects" again — section collapses
  - [x] Error path: enter a non-existent path, click Find — error message appears, auto-clears after ~3s
  - [x] Existing Add input still works (no regressions)
  - [x] No console errors during any of the above
- [x] Fix any issues found
- [x] Commit any fixes: `fix: <description>`

**Success criteria:**
- [x] All manual flows pass without errors
- [x] No regressions to existing panel behavior

---

### 9. E2E automated test

- [x] In `tests/test_ui_smoke.py` (or a new `tests/test_ui_discover.py`), add E2E test(s) for the discovery flow:
  - [x] `test_discover_section_expands`: navigate to app, expand panel, click "Find projects" toggle, assert root input becomes visible
  - [x] `test_discover_find_populates_results`: with at least one valid candidate in the scan root, click Find, assert at least one result row appears
  - [x] (Optional) `test_discover_row_add`: click Add on a result row, assert project appears in panel list
- [x] Mark tests with `pytestmark = pytest.mark.e2e`
- [x] Run `pytest tests/ -m e2e -v` — E2E tests pass
- [x] Run `pytest tests/` — full suite passes
- [x] Commit: `test: add E2E tests for discover section`

**Success criteria:**
- [x] At least 2 E2E test cases added and passing
- [x] Full test suite passes (no regressions)

---

### 10. Final — mark slice complete

- [x] Run `pytest tests/` — all tests pass
- [x] Update slice status to `complete` in `107-slice.local-project-discovery.md`
- [x] Check off slice 122 in `120-slices.project-management.md`
- [x] Write DEVLOG entry for slice 122 with commit hashes
- [x] Commit: `docs: mark slice 122 complete`

**Success criteria:**
- [x] All tests pass
- [x] Slice design file status is `complete`
- [x] Slice 122 checked off in slice plan
- [x] DEVLOG updated
