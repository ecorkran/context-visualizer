---
docType: tasks
slice: mcp-native-project-registry
project: context-visualizer
lld: user/slices/127-slice.mcp-native-project-registry.md
dependencies:
  - 123-slice.mcp-client
  - 126-slice.cross-project-dashboard-view
projectState: >
  Initiative 120 complete through slice 126. serve.py reads the project
  catalog from projects/manifest.json via _read_manifest, with a parallel
  MCP path already wired for /api/structures, /api/refresh (MCP branch),
  /api/dashboard (populates name→ID from MCP but iterates manifest), and
  /api/info (manifest-only). _handle_refresh_local runs parse.py via
  subprocess as the local fallback. All tests in tests/test_serve.py that
  target manifest-backed behavior will need to be updated or removed.
  parse.py remains in use by _handle_discover and is not touched.
dateCreated: 20260422
dateUpdated: 20260422
status: not_started
---

## Context Summary

- Slice 127: Replace manifest + parse.py subprocess with MCP-native catalog access.
- `GET /api/projects`, `POST /api/refresh`, `GET /api/dashboard`, `GET /api/info` are refactored to source project data from MCP `project_list`.
- `_handle_refresh_local` and manifest helpers (`_manifest_path`, `_parse_py`, `_read_manifest`, `_write_manifest`) are deleted.
- `projects/manifest.json` and all `projects/*-structure.json` files are deleted.
- `parse.py` remains on disk; `_handle_discover` still uses it.
- MCP-disconnected state returns `503` for all catalog-dependent endpoints — no silent fallback.
- Response shape for `GET /api/projects` drops the `file` field; other contracts unchanged.
- No UI changes required.

---

## Task 1: Add `_mcp_project_list` helper for consistent catalog access

- [ ] In `serve.py`, add a module-level helper `_mcp_project_list(client: McpClient) -> list[dict]`
  - [ ] Calls `client.call_tool("project_list", {})`
  - [ ] Passes the returned `projects` array to `_refresh_name_to_id` to keep the cache fresh
  - [ ] Returns the raw `projects` list
  - [ ] Raises the underlying exception on failure (callers decide how to respond)
- [ ] Add a helper `_project_to_api_entry(proj: dict) -> dict` that maps an MCP project dict to the API contract:
  - [ ] `key` = `proj["name"].lower().replace(" ", "-")`
  - [ ] `displayName` = `proj.get("displayName") or proj["name"]`
  - [ ] `sourcePath` = `proj.get("projectPath", "")`

## Task 2: Unit test the helpers

- [ ] In `tests/test_serve.py` (or a new `tests/test_mcp_helpers.py`), add tests using a stub `McpClient`:
  - [ ] `_mcp_project_list` returns the list from the tool response
  - [ ] `_mcp_project_list` updates `_mcp_name_to_id` as a side effect
  - [ ] `_project_to_api_entry` produces the expected shape with `displayName` fallback to `name` when absent
  - [ ] `_project_to_api_entry` sets `sourcePath` to `""` when `projectPath` is absent
  - [ ] Spaces in `name` are hyphenated and lowercased in `key`

## Task 3: Refactor `_handle_list_projects` (GET /api/projects)

- [ ] Replace the manifest read with an MCP call:
  - [ ] If `_mcp_client is None` or `not _mcp_client.connected`, return `503` with `{"status": "error", "message": "MCP unavailable"}`
  - [ ] Call `_mcp_project_list(client)`; on exception, return `503` with `{"status": "error", "message": str(exc)}`
  - [ ] Map each project through `_project_to_api_entry`
  - [ ] Return `200` with `{"status": "ok", "projects": [...]}`
- [ ] Do not include a `file` field in the response entries

## Task 4: Test `GET /api/projects` against MCP stub

- [ ] Replace or update existing `TestListProjects` cases in `tests/test_serve.py`:
  - [ ] Success path: MCP stub returns two projects → response has `status: ok` and two entries with `key`, `displayName`, `sourcePath` and no `file` field
  - [ ] MCP-disconnected: no client configured → `503` with `message: "MCP unavailable"`
  - [ ] MCP call raises: stub raises from `call_tool` → `503` with exception message
  - [ ] Empty catalog: MCP returns `projects: []` → `200` with empty array

## Task 5: Delete `_handle_refresh_local` and simplify `_handle_refresh`

- [ ] In `_handle_refresh`, remove the `else` branch that calls `_handle_refresh_local`
- [ ] When `_mcp_client is None` or `not _mcp_client.connected`, return `503` with `{"status": "error", "message": "MCP unavailable"}`
- [ ] Delete the `_handle_refresh_local` method entirely
- [ ] Remove the `import subprocess` that was only used by `_handle_refresh_local` (if no other caller remains in `serve.py`)
- [ ] `_handle_refresh_mcp` body is unchanged

## Task 6: Test `POST /api/refresh` MCP-disconnected path

- [ ] Update existing refresh tests in `tests/test_serve.py`:
  - [ ] Remove or rewrite tests that exercised the local parse.py subprocess path (`test_missing_manifest_returns_500`, `test_missing_source_path_returns_error`)
  - [ ] Add: MCP disconnected → `POST /api/refresh` returns `503` with `message: "MCP unavailable"`
  - [ ] Add: MCP connected with stub returning two projects → `POST /api/refresh` returns `200` with `projects` list
  - [ ] Add: malformed JSON body is still tolerated → refresh-all behavior under MCP (already tested by `test_server_does_not_crash_on_bad_body`; update to MCP context)

## Task 7: Refactor `_handle_dashboard` to source the project list from MCP

- [ ] Replace the `manifest, err = self._read_manifest()` block near the top of `_handle_dashboard` with:
  - [ ] Call `_mcp_project_list(client)` (the MCP-connected check earlier in the handler already returns `503` on disconnect — no change there)
  - [ ] Build the equivalent of `raw_projects` from the MCP response by mapping each project to `{"key": ..., "displayName": ...}` via `_project_to_api_entry`
- [ ] Preserve existing behavior for:
  - [ ] Panel color assignment by index (`_panel_colors[i % len(_panel_colors)]`)
  - [ ] Prefs-based ordering (starred first, hidden excluded)
  - [ ] Sequential `workflow_status`/`workflow_next`/`workflow_check` fan-out per project
- [ ] The `_mcp_name_to_id` cache is now guaranteed fresh after `_mcp_project_list` — the `if not _mcp_name_to_id` repopulation block inside the handler may be removed (simplification)

## Task 8: Test `GET /api/dashboard` against MCP stub

- [ ] Update `tests/test_ui_dashboard.py` (or `tests/test_serve.py` dashboard tests):
  - [ ] Stub `project_list` returning two projects; confirm both appear as tiles in returned order
  - [ ] Stub `workflow_status`/`workflow_next`/`workflow_check` and confirm fields populate the tile
  - [ ] Prefs: starred project appears first; hidden project excluded — with MCP as the list source (not manifest)
  - [ ] MCP disconnected → `503` (unchanged behavior; confirm still passes)
  - [ ] `project_list` raises → the disconnect path or a clear `503`/error envelope (choose whichever matches the handler's actual behavior after refactor; document expected response)

## Task 9: Refactor `_handle_info` to source paths from MCP

- [ ] Replace the manifest read with:
  - [ ] MCP-disconnected check: return `503` with `{"status": "error", "message": "MCP unavailable"}`
  - [ ] Call `_mcp_project_list(client)`; on exception, return `503`
  - [ ] Extract `projectPath` values from each project
- [ ] Preserve the existing `commonpath` logic for `scanRoot` derivation:
  - [ ] 2+ paths: `commonpath` of the set; if it equals a source path exactly, go one level up
  - [ ] 1 path: parent of that path
  - [ ] 0 paths: user home directory (status `ok` still returned in this edge case when MCP returns an empty catalog)

## Task 10: Test `GET /api/info` MCP behavior

- [ ] Update existing `_handle_info` tests (search `tests/test_serve.py` and `tests/test_ui_*.py`):
  - [ ] MCP disconnected → `503`
  - [ ] MCP returns two projects under a common parent → `scanRoot` is that parent
  - [ ] MCP returns one project → `scanRoot` is the project's parent
  - [ ] MCP returns empty catalog → `scanRoot` is the home directory (existing fallback)

## Task 11: Remove manifest helper methods

- [ ] Delete from the `Handler` class:
  - [ ] `_manifest_path`
  - [ ] `_parse_py` (only if no other caller remains; check — `_handle_discover` and `_handle_add_project` use it)
  - [ ] `_read_manifest`
  - [ ] `_write_manifest`
- [ ] Note: `_parse_py` is still used by `_handle_discover` — keep it, and keep the `parse.py` file on disk
- [ ] Delete `_handle_list_projects`'s old manifest implementation (superseded by Task 3)
- [ ] Delete `_handle_add_project` and `_handle_remove_project` methods
- [ ] Remove routing for `POST /api/projects`, `DELETE /api/projects/{key}` from `do_POST` and `do_DELETE`
- [ ] `do_DELETE` with no remaining routes: delete the method entirely
- [ ] `do_PATCH` for `PATCH /api/projects/{key}` remains (prefs management)

## Task 12: Test that removed endpoints return 404

- [ ] In `tests/test_serve.py`:
  - [ ] `POST /api/projects` with any body → `404 Not Found`
  - [ ] `DELETE /api/projects/{key}` → `404 Not Found` (do_DELETE no longer handles this path)
  - [ ] Delete or archive the `TestAddProject` and `TestRemoveProject` test classes entirely
  - [ ] `PATCH /api/projects/{key}` prefs tests still pass (unchanged behavior)

## Task 13: Delete manifest and static structure files

- [ ] Delete:
  - [ ] `projects/manifest.json`
  - [ ] `projects/context-forge-structure.json`
  - [ ] `projects/context-visualizer-structure.json`
  - [ ] `projects/orchestration-structure.json`
- [ ] `projects/` directory itself may remain empty or be deleted — choose empty-retained for simplicity
- [ ] `.gitignore` review: if `projects/*.json` was previously tracked, stage the deletion for commit; no new ignore rules needed

## Task 14: Confirm no manifest / parse.py subprocess references remain

- [ ] In `serve.py`, `grep -n "manifest"` should return zero matches outside comments/docstrings
- [ ] In `serve.py`, `grep -n "subprocess"` should return zero matches (subprocess import and usage are gone)
- [ ] In `serve.py`, `grep -n "parse\.py\|parse_py"` should return matches only inside `_handle_discover` (via `sys.path.insert` + `from parse import ...`)
- [ ] Update module-level docstring at the top of `serve.py`:
  - [ ] Remove references to "re-invokes the parser"
  - [ ] State that the server requires an MCP connection for catalog endpoints

## Task 15: End-to-end verification against live MCP

- [ ] Restart the dev server: `lsof -ti :5678 | xargs kill -9 2>/dev/null; sleep 1 && python serve.py --port 5678`
- [ ] Confirm log line: `INFO: MCP mode active`
- [ ] Run each command from the slice's Verification Walkthrough and capture results:
  - [ ] `curl -s http://localhost:5678/api/projects` → `status: ok`, entries lack `file`
  - [ ] `curl -s -X POST http://localhost:5678/api/refresh` → `status: ok`
  - [ ] `curl -s http://localhost:5678/api/dashboard` → tiles populate correctly
  - [ ] `curl -s http://localhost:5678/api/info` → reasonable `scanRoot`
  - [ ] `curl -s "http://localhost:5678/api/discover?root=/Users/manta/source/repos/manta"` → candidate list returned

## Task 16: End-to-end verification with MCP disconnected

- [ ] Stop the server. Temporarily rename `mcp-config.json` → `mcp-config.json.bak` (or edit command to a non-existent binary).
- [ ] Restart. Confirm log line: `WARNING: MCP connection failed — running in local mode` (or equivalent disconnected log).
- [ ] Confirm 503 responses:
  - [ ] `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5678/api/projects` → `503`
  - [ ] `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5678/api/refresh` → `503`
  - [ ] `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5678/api/dashboard` → `503`
  - [ ] `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5678/api/info` → `503`
  - [ ] `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5678/api/structures` → `503`
- [ ] Restore `mcp-config.json` before proceeding.

## Task 17: Browser smoke test with Playwright MCP

- [ ] With the server running and MCP connected, open `http://localhost:5678` via Playwright MCP (`browser_navigate`)
- [ ] Confirm:
  - [ ] Panel renders project rows with correct display names
  - [ ] Clicking a project row activates the detail view
  - [ ] ↻ refresh button completes without error (network tab: `POST /api/refresh` → `200`)
  - [ ] Dashboard toggle shows tiles with phase, slice, recommendation, findings populated
  - [ ] Console: no errors related to missing `file` field or manifest
- [ ] Capture a screenshot of the panel + dashboard as evidence (`browser_take_screenshot`)

## Task 18: Full test suite passes

- [ ] Run the full test suite: `cd /Users/manta/source/repos/manta/context-visualizer && python -m pytest`
- [ ] All tests pass
- [ ] Total test count unchanged or reduced only by the intentionally removed add/remove/local-refresh tests (document the delta in the commit message)

## Task 19: Docstrings and comments

- [ ] Update `_handle_refresh` docstring to remove the "Local mode" reference
- [ ] Update `_handle_structures` docstring — the "Local path: returns 503 telling the frontend to use manifest+JSON fallback" note is now stale; simplify to "MCP-only; returns 503 when disconnected"
- [ ] Update the top-of-file module docstring to reflect MCP-only catalog operation
- [ ] Review remaining comments in `serve.py` for stale manifest references; rewrite or delete

## Task 20: Mark slice and task file complete

- [ ] Update `project-documents/user/slices/127-slice.mcp-native-project-registry.md` frontmatter: `status: complete`
- [ ] Update this task file frontmatter: `status: complete`
- [ ] Check off the slice entry in `project-documents/user/architecture/120-slices.project-management.md` (change `[ ]` → `[x]` on the 127 entry)
- [ ] Add a DEVLOG entry summarizing the slice, including commit hashes
