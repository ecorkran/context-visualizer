---
docType: tasks
slice: project-management-api
project: context-visualizer
lld: user/slices/105-slice.project-management-api.md
dependencies: []
projectState: Initiative 100 complete (serve.py, manifest.json, parse.py with update_manifest). Bug fixes committed. Slice 105 design approved.
dateCreated: 20260226
dateUpdated: 20260226
---

## Context Summary

- Working on slice 105: Project Management API
- Initiative 100 complete — `serve.py` serves static files with `POST /api/refresh`; `parse.py` writes per-project JSON to `projects/` and updates `manifest.json`
- This slice adds `displayName` to manifest entries and three catalog management endpoints (`GET /api/projects`, `POST /api/projects`, `DELETE /api/projects/{key}`)
- No UI changes — backend only, testable via `curl`
- Next planned slice: 106 (Project Panel UI), which consumes these endpoints
- Key files: `parse.py`, `serve.py`, `tests/test_parse.py`, `tests/test_serve.py`

---

## Tasks

### 1. Add `displayName` to manifest entries in `parse.py`

- [ ] Add `display_name` parameter to `update_manifest()` function signature (optional, default `None`)
- [ ] When `display_name` is provided, include `"displayName"` in the manifest entry dict
- [ ] In `main()`, pass `model["name"]` as `display_name` when calling `update_manifest()`
  - `model["name"]` is already computed by `build_model()` — no new logic needed
- [ ] Verify: run `python parse.py /path/to/context-forge` and confirm `projects/manifest.json` now contains `"displayName"` for the parsed project
- [ ] Commit

**Success criteria:**
- [ ] `update_manifest()` accepts and writes `displayName` when provided
- [ ] `main()` passes model name to `update_manifest()`
- [ ] Re-parsing an existing project updates its `displayName` in the manifest
- [ ] Existing callers of `update_manifest()` (without `display_name`) still work (backward compatible)

### 2. Test `displayName` in manifest

- [ ] In `tests/test_parse.py`, add a test that verifies `displayName` is written to the manifest after parsing
  - Use the existing `_make_project` fixture to build a synthetic project
  - Run `parse.py` via subprocess (or call `update_manifest()` directly)
  - Read `manifest.json` and assert `displayName` is present and matches expected value
- [ ] Add a test that re-parsing updates `displayName` (idempotent, no duplicate entries)
- [ ] Verify all existing tests still pass: `pytest tests/`
- [ ] Commit

**Success criteria:**
- [ ] Test confirms `displayName` field is present in manifest after parse
- [ ] Test confirms re-parse updates rather than duplicates
- [ ] All existing `test_parse.py` tests pass

### 3. Add `GET /api/projects` endpoint to `serve.py`

- [ ] Add `_handle_list_projects()` method to `Handler` class
  - Read `projects/manifest.json`
  - Return `{"status": "ok", "projects": [...]}` with all manifest entries
  - On read error, return `{"status": "error", "message": "..."}`
- [ ] Update `do_GET()` to dispatch `/api/projects` to `_handle_list_projects()`
  - Keep existing `/api/refresh` → 405 guard
  - All other paths fall through to `super().do_GET()` (static files)
- [ ] Commit

**Success criteria:**
- [ ] `curl http://localhost:8000/api/projects` returns JSON with all manifest entries
- [ ] Response includes `displayName` for entries that have it
- [ ] Static file serving and `/api/refresh` still work correctly

### 4. Test `GET /api/projects`

- [ ] In `tests/test_serve.py`, add a test class for the projects endpoint
- [ ] Test: `GET /api/projects` with a populated manifest returns 200 with correct entries
- [ ] Test: `GET /api/projects` with an empty manifest returns 200 with empty `projects` array
- [ ] Test: `GET /api/projects` when manifest is missing returns 500 with error message
- [ ] Verify all existing tests pass: `pytest tests/`
- [ ] Commit

**Success criteria:**
- [ ] Happy path returns all manifest entries
- [ ] Empty manifest returns empty array (not error)
- [ ] Missing manifest returns structured error
- [ ] All existing `test_serve.py` tests pass

### 5. Add `POST /api/projects` endpoint to `serve.py`

- [ ] Add `_handle_add_project()` method to `Handler` class
  - Read JSON body, extract `path` field
  - Validate: `path` is present and non-empty (400 if missing)
  - Validate: path exists on filesystem (400 if not)
  - Validate: path contains a project structure — import and call `find_user_dir()` from `parse.py` (400 if no `project-documents/user/`)
  - Run `subprocess.run([sys.executable, parse_py, path])` to parse and add to manifest
  - On parse success: read updated manifest, find the new/updated entry by key, return `{"status": "ok", "project": {...}}`
  - On parse failure: return `{"status": "error", "message": "Parser error: ..."}`
- [ ] Derive `key` from path the same way `parse.py` does: `Path(path).resolve().name.lower().replace(" ", "-")`
- [ ] Update `do_POST()` to dispatch `/api/projects` to `_handle_add_project()`
  - Keep existing `/api/refresh` dispatch
- [ ] Commit

**Success criteria:**
- [ ] `POST /api/projects {"path": "/valid/project"}` parses, adds to manifest, returns new entry
- [ ] Missing `path` field returns 400
- [ ] Non-existent path returns 400
- [ ] Path without `project-documents/user/` returns 400
- [ ] Re-adding existing project re-parses without error (idempotent)
- [ ] `/api/refresh` still works

### 6. Test `POST /api/projects`

- [ ] Test: POST with a valid synthetic project path → 200, project added to manifest, JSON file created in projects dir
- [ ] Test: POST with missing `path` field → 400 with error message
- [ ] Test: POST with non-existent path → 400 with error message
- [ ] Test: POST with path that has no `project-documents/user/` → 400 with error message
- [ ] Test: POST same project twice → 200 both times, manifest has exactly one entry for that key (idempotent)
- [ ] Verify all existing tests pass: `pytest tests/`
- [ ] Commit

**Success criteria:**
- [ ] All happy-path and error-path cases covered
- [ ] Idempotent re-add verified
- [ ] No regressions

### 7. Add `DELETE /api/projects/{key}` endpoint to `serve.py`

- [ ] Add `do_DELETE()` method to `Handler` class
  - Match paths starting with `/api/projects/` and extract key from the remainder
  - Dispatch to `_handle_remove_project(key)`
  - Return 404 for other DELETE paths
- [ ] Add `_handle_remove_project(key)` method
  - Read manifest, find entry matching `key`
  - If not found: return 404 `{"status": "error", "message": "Project '{key}' not found"}`
  - Remove entry from manifest's `projects` array
  - Write updated manifest
  - Delete `projects/{file}` if it exists (no error if already absent)
  - Return 200 `{"status": "ok", "removed": "key"}`
- [ ] Commit

**Success criteria:**
- [ ] `DELETE /api/projects/context-forge` removes entry and deletes JSON file
- [ ] Nonexistent key returns 404
- [ ] Manifest is correctly updated (entry gone, other entries intact)
- [ ] Missing JSON file does not cause error (graceful)

### 8. Test `DELETE /api/projects/{key}`

- [ ] Test: DELETE existing key → 200, entry removed from manifest, JSON file deleted
- [ ] Test: DELETE nonexistent key → 404 with error message
- [ ] Test: DELETE when JSON file is already absent → 200 (manifest entry still removed)
- [ ] Test: DELETE preserves other manifest entries
- [ ] Verify all tests pass: `pytest tests/`
- [ ] Commit

**Success criteria:**
- [ ] All happy-path and edge cases covered
- [ ] No regressions in existing tests

### 9. Manual verification and backfill

- [ ] Run `python parse.py` against all tracked projects to backfill `displayName` into existing manifest entries
- [ ] Start server (`python serve.py`) and verify all three endpoints via curl:
  - `curl http://localhost:8000/api/projects` — lists projects with displayName
  - `curl -X POST -H 'Content-Type: application/json' -d '{"path":"/path/to/project"}' http://localhost:8000/api/projects` — adds a project
  - `curl -X DELETE http://localhost:8000/api/projects/{key}` — removes it
- [ ] Verify `/api/refresh` still works after the routing changes
- [ ] Run full test suite: `pytest tests/`
- [ ] Commit updated `manifest.json` with backfilled `displayName` fields
- [ ] Final commit: update slice status to `complete` in `105-slice.project-management-api.md`

**Success criteria:**
- [ ] All endpoints work correctly via curl
- [ ] Existing refresh endpoint unaffected
- [ ] Full test suite passes
- [ ] Manifest has `displayName` for all tracked projects
