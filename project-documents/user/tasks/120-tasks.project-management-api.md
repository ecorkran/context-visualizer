---
docType: tasks
slice: project-management-api
project: context-visualizer
lld: user/slices/120-slice.project-management-api.md
dependencies: []
projectState: Initiative 100 complete (serve.py, manifest.json, parse.py with update_manifest). Bug fixes committed. Slice 120 design approved.
dateCreated: 20260226
dateUpdated: 20260226
---

## Context Summary

- Working on slice 120: Project Management API
- Initiative 100 complete — `serve.py` serves static files with `POST /api/refresh`; `parse.py` writes per-project JSON to `projects/` and updates `manifest.json`
- This slice adds `displayName` to manifest entries and three catalog management endpoints (`GET /api/projects`, `POST /api/projects`, `DELETE /api/projects/{key}`)
- No UI changes — backend only, testable via `curl`
- Next planned slice: 121 (Project Panel UI), which consumes these endpoints
- Key files: `parse.py`, `serve.py`, `tests/test_parse.py`, `tests/test_serve.py`

---

## Tasks

### 1. Add `displayName` to manifest entries in `parse.py`

- [x] Add `display_name` parameter to `update_manifest()` function signature (optional, default `None`)
- [x] When `display_name` is provided, include `"displayName"` in the manifest entry dict
- [x] In `main()`, pass `model["name"]` as `display_name` when calling `update_manifest()`
  - `model["name"]` is already computed by `build_model()` — no new logic needed
- [x] Verify: run `python parse.py /path/to/context-forge` and confirm `projects/manifest.json` now contains `"displayName"` for the parsed project
- [x] Commit

**Success criteria:**
- [x] `update_manifest()` accepts and writes `displayName` when provided
- [x] `main()` passes model name to `update_manifest()`
- [x] Re-parsing an existing project updates its `displayName` in the manifest
- [x] Existing callers of `update_manifest()` (without `display_name`) still work (backward compatible)

### 2. Test `displayName` in manifest

- [x] In `tests/test_parse.py`, add a test that verifies `displayName` is written to the manifest after parsing
  - Use the existing `_make_project` fixture to build a synthetic project
  - Run `parse.py` via subprocess (or call `update_manifest()` directly)
  - Read `manifest.json` and assert `displayName` is present and matches expected value
- [x] Add a test that re-parsing updates `displayName` (idempotent, no duplicate entries)
- [x] Verify all existing tests still pass: `pytest tests/`
- [x] Commit

**Success criteria:**
- [x] Test confirms `displayName` field is present in manifest after parse
- [x] Test confirms re-parse updates rather than duplicates
- [x] All existing `test_parse.py` tests pass

### 3. Add `GET /api/projects` endpoint to `serve.py`

- [x] Add `_handle_list_projects()` method to `Handler` class
  - Read `projects/manifest.json`
  - Return `{"status": "ok", "projects": [...]}` with all manifest entries
  - On read error, return `{"status": "error", "message": "..."}`
- [x] Update `do_GET()` to dispatch `/api/projects` to `_handle_list_projects()`
  - Keep existing `/api/refresh` → 405 guard
  - All other paths fall through to `super().do_GET()` (static files)
- [x] Commit

**Success criteria:**
- [x] `curl http://localhost:8000/api/projects` returns JSON with all manifest entries
- [x] Response includes `displayName` for entries that have it
- [x] Static file serving and `/api/refresh` still work correctly

### 4. Test `GET /api/projects`

- [x] In `tests/test_serve.py`, add a test class for the projects endpoint
- [x] Test: `GET /api/projects` with a populated manifest returns 200 with correct entries
- [x] Test: `GET /api/projects` with an empty manifest returns 200 with empty `projects` array
- [x] Test: `GET /api/projects` when manifest is missing returns 500 with error message
- [x] Verify all existing tests pass: `pytest tests/`
- [x] Commit

**Success criteria:**
- [x] Happy path returns all manifest entries
- [x] Empty manifest returns empty array (not error)
- [x] Missing manifest returns structured error
- [x] All existing `test_serve.py` tests pass

### 5. Add `POST /api/projects` endpoint to `serve.py`

- [x] Add `_handle_add_project()` method to `Handler` class
  - Read JSON body, extract `path` field
  - Validate: `path` is present and non-empty (400 if missing)
  - Validate: path exists on filesystem (400 if not)
  - Validate: path contains a project structure — import and call `find_user_dir()` from `parse.py` (400 if no `project-documents/user/`)
  - Run `subprocess.run([sys.executable, parse_py, path])` to parse and add to manifest
  - On parse success: read updated manifest, find the new/updated entry by key, return `{"status": "ok", "project": {...}}`
  - On parse failure: return `{"status": "error", "message": "Parser error: ..."}`
- [x] Derive `key` from path the same way `parse.py` does: `Path(path).resolve().name.lower().replace(" ", "-")`
- [x] Update `do_POST()` to dispatch `/api/projects` to `_handle_add_project()`
  - Keep existing `/api/refresh` dispatch
- [x] Commit

**Success criteria:**
- [x] `POST /api/projects {"path": "/valid/project"}` parses, adds to manifest, returns new entry
- [x] Missing `path` field returns 400
- [x] Non-existent path returns 400
- [x] Path without `project-documents/user/` returns 400
- [x] Re-adding existing project re-parses without error (idempotent)
- [x] `/api/refresh` still works

### 6. Test `POST /api/projects`

- [x] Test: POST with a valid synthetic project path → 200, project added to manifest, JSON file created in projects dir
- [x] Test: POST with missing `path` field → 400 with error message
- [x] Test: POST with non-existent path → 400 with error message
- [x] Test: POST with path that has no `project-documents/user/` → 400 with error message
- [x] Test: POST same project twice → 200 both times, manifest has exactly one entry for that key (idempotent)
- [x] Verify all existing tests pass: `pytest tests/`
- [x] Commit

**Success criteria:**
- [x] All happy-path and error-path cases covered
- [x] Idempotent re-add verified
- [x] No regressions

### 7. Add `DELETE /api/projects/{key}` endpoint to `serve.py`

- [x] Add `do_DELETE()` method to `Handler` class
  - Match paths starting with `/api/projects/` and extract key from the remainder
  - Dispatch to `_handle_remove_project(key)`
  - Return 404 for other DELETE paths
- [x] Add `_handle_remove_project(key)` method
  - Read manifest, find entry matching `key`
  - If not found: return 404 `{"status": "error", "message": "Project '{key}' not found"}`
  - Remove entry from manifest's `projects` array
  - Write updated manifest
  - Delete `projects/{file}` if it exists (no error if already absent)
  - Return 200 `{"status": "ok", "removed": "key"}`
- [x] Commit

**Success criteria:**
- [x] `DELETE /api/projects/context-forge` removes entry and deletes JSON file
- [x] Nonexistent key returns 404
- [x] Manifest is correctly updated (entry gone, other entries intact)
- [x] Missing JSON file does not cause error (graceful)

### 8. Test `DELETE /api/projects/{key}`

- [x] Test: DELETE existing key → 200, entry removed from manifest, JSON file deleted
- [x] Test: DELETE nonexistent key → 404 with error message
- [x] Test: DELETE when JSON file is already absent → 200 (manifest entry still removed)
- [x] Test: DELETE preserves other manifest entries
- [x] Verify all tests pass: `pytest tests/`
- [x] Commit

**Success criteria:**
- [x] All happy-path and edge cases covered
- [x] No regressions in existing tests

### 9. Manual verification and backfill

- [x] Run `python parse.py` against all tracked projects to backfill `displayName` into existing manifest entries
- [x] Start server (`python serve.py`) and verify all three endpoints via curl:
  - `curl http://localhost:8000/api/projects` — lists projects with displayName
  - `curl -X POST -H 'Content-Type: application/json' -d '{"path":"/path/to/project"}' http://localhost:8000/api/projects` — adds a project
  - `curl -X DELETE http://localhost:8000/api/projects/{key}` — removes it
- [x] Verify `/api/refresh` still works after the routing changes
- [x] Run full test suite: `pytest tests/`
- [x] Commit updated `manifest.json` with backfilled `displayName` fields
- [x] Final commit: update slice status to `complete` in `120-slice.project-management-api.md`

**Success criteria:**
- [x] All endpoints work correctly via curl
- [x] Existing refresh endpoint unaffected
- [x] Full test suite passes
- [x] Manifest has `displayName` for all tracked projects
