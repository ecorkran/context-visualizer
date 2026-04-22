---
docType: slice
layer: project
project: context-visualizer
sliceIndex: 127
initiative: 120
component: project-management
title: MCP-Native Project Registry
dateCreated: 20260417
dateUpdated: 20260417
status: design
dependencies: [123]
riskLevel: medium
effort: 3
---

## Overview

Replace `projects/manifest.json`, static `projects/*.json` files, and all `parse.py` subprocess calls with MCP-native project discovery. `GET /api/projects` reads the project catalog from MCP `project_list`; `POST /api/refresh` fetches live structure data from MCP `project_structure`. The local-mode fallback code paths (`_handle_refresh_local`, `_handle_add_project`, `_handle_remove_project`, and related manifest helpers) are retired entirely. The manifest file and static structure JSON files are deleted. `parse.py` remains on disk as a standalone CLI utility but is no longer invoked by the server.

**Motivation:** The manifest and static JSON files are a second source of truth for a catalog that context-forge already owns. They drift silently whenever a project is added, renamed, or removed outside the visualizer. Removing them eliminates the divergence class of bugs entirely and makes the registry always live.

---

## Scope

### In scope
- `GET /api/projects` — sourced from MCP `project_list` instead of manifest.
- `POST /api/refresh` — delegates to `_handle_refresh_mcp` only; local path removed.
- `PATCH /api/projects/{key}` — retained as-is (manages starred/hidden prefs, unrelated to the registry).
- `GET /api/info` — `_handle_info` currently reads source paths from the manifest; this changes to derive the scan root from MCP `project_list` results.
- `GET /api/dashboard` — currently reads the manifest for project ordering/color assignment; changes to use MCP `project_list` as the authoritative project list.
- `_manifest_path`, `_parse_py`, `_read_manifest`, `_write_manifest` helpers — deleted.
- `projects/manifest.json` and `projects/*-structure.json` files — deleted.

### Out of scope
- Replacing `GET /api/discover` (which calls `parse.py` to detect valid project directories). This endpoint's purpose is to find projects _not yet known to MCP_, making it inherently local-filesystem-based. It is not modified by this slice.
- Any UI changes — the panel UI interacts only with API endpoints; their contract is preserved.
- Add/remove project endpoints (`POST /api/projects`, `DELETE /api/projects/{key}`) — these never existed in the production code path and are not added here. Catalog management is context-forge's responsibility.

---

## Technical Design

### `GET /api/projects`

**Current:** reads `projects/manifest.json`, returns the `projects` array with `key`, `file`, `sourcePath`, `displayName` fields.

**New:** calls MCP `project_list`, maps the result to the same shape the frontend expects:

```python
# project_list returns a list of dicts; each has at minimum:
#   id, name, projectPath (and possibly displayName)
# Map to API contract:
{
  "key":         proj["name"].lower().replace(" ", "-"),
  "displayName": proj.get("displayName") or proj["name"],
  "sourcePath":  proj.get("projectPath", ""),
}
```

`file` (the static JSON filename) is omitted — the frontend should not reference static files; it fetches live data from `/api/structures`.

If MCP is disconnected, return `503` with `{"status": "error", "message": "MCP unavailable"}`.

### `POST /api/refresh`

**Current:** branches on `_mcp_client is not None` — MCP path calls `_handle_refresh_mcp`, local path calls `_handle_refresh_local` (which runs `parse.py` via subprocess).

**New:** `_handle_refresh_local` is deleted. If MCP is disconnected, return `503`. The MCP path is unchanged in behavior.

### `GET /api/dashboard`

**Current:** reads manifest for the ordered project list, then populates name→ID via MCP.

**New:** calls `project_list` first (same as `_handle_refresh_mcp` already does), builds the ordered list from MCP results, applies prefs (starred/hidden) to produce the final order. Panel colors are assigned by index in the MCP-returned order (consistent with current behavior; only the source of the list changes).

The manifest read at the top of `_handle_dashboard` is replaced with an MCP `project_list` call. If MCP is disconnected, the existing `503` path is unaffected.

### `GET /api/info`

**Current:** reads source paths from manifest to compute a `scanRoot`.

**New:** calls `project_list` to get `projectPath` values; same `commonpath` logic applies.

If MCP is disconnected, return `503`.

### `_mcp_name_to_id` cache

This global cache and `_refresh_name_to_id` remain as-is. They are populated from `project_list` results at each call site that needs them, exactly as today.

### Endpoint contract changes (frontend impact)

| Endpoint | Change |
|---|---|
| `GET /api/projects` | Response shape preserved; `file` field removed |
| `POST /api/refresh` | Contract unchanged; MCP-disconnected now `503` instead of falling back to local |
| `GET /api/dashboard` | Contract unchanged |
| `GET /api/info` | MCP-disconnected now `503` (was: home-directory fallback) |
| `GET /api/structures` | Unchanged |

The panel UI renders the project list from `GET /api/projects` and triggers refresh via `POST /api/refresh`. Neither of these changes shape. Add/remove endpoints do not exist and are not introduced.

### Files deleted

- `projects/manifest.json`
- `projects/context-forge-structure.json`
- `projects/context-visualizer-structure.json`
- `projects/orchestration-structure.json`

`parse.py` is **not deleted** — it remains a working standalone CLI tool. Its import from `_handle_discover` is unchanged.

---

## Data Flow

```
GET /api/projects
  → MCP project_list → map to {key, displayName, sourcePath} → 200

POST /api/refresh
  → MCP project_list → filter to requested subset → MCP project_structure × N → 200

GET /api/dashboard
  → MCP project_list → apply prefs (starred/hidden) → MCP workflow_status × N
                     → MCP workflow_next × N → MCP workflow_check × N → 200

GET /api/info
  → MCP project_list → extract projectPath values → commonpath → 200
```

---

## Cross-Slice Dependencies

| Slice | Role |
|---|---|
| [123] MCP Client | `McpClient` and `_mcp_client` global — required; this slice is MCP-only |
| [120] Project Management API | Defines the endpoint contracts this slice replaces |
| [126] Dashboard View | `_handle_dashboard` is refactored by this slice |

---

## Success Criteria

1. `GET /api/projects` returns projects sourced from MCP `project_list` with `key`, `displayName`, `sourcePath` fields — no manifest read.
2. `POST /api/refresh` succeeds when MCP is connected; returns `503` when disconnected — no `parse.py` subprocess.
3. `GET /api/dashboard` works correctly (ordered/colored tiles, prefs applied) without reading the manifest.
4. `GET /api/info` returns a valid `scanRoot` derived from MCP project paths.
5. `manifest.json` and all `*-structure.json` files in `projects/` are deleted; server starts and operates without them.
6. `_handle_refresh_local`, `_manifest_path`, `_parse_py`, `_read_manifest`, `_write_manifest` are removed from `serve.py`.
7. `GET /api/discover` continues to function (uses `parse.py` imports directly, unchanged).
8. No regressions in `/api/structures`, `/api/worktrees`, `/api/future-work`, `/api/status`.
9. Panel UI renders the project list and refresh works end-to-end in a running browser session.
10. MCP-disconnected state: all catalog-dependent endpoints (`/api/projects`, `/api/refresh`, `/api/dashboard`, `/api/info`, `/api/structures`) return `503` — no silent fallback, no 500s from missing manifest.

---

## Verification Walkthrough

1. **Start server with MCP connected** (`python serve.py --port 5678`). Check log: `INFO: MCP mode active`.

2. **Project list:**
   ```bash
   curl -s http://localhost:5678/api/projects | python3 -m json.tool
   ```
   Expect: `status: ok`, array of projects with `key`, `displayName`, `sourcePath` — no `file` field.

3. **Refresh all:**
   ```bash
   curl -s -X POST http://localhost:5678/api/refresh | python3 -m json.tool
   ```
   Expect: `status: ok`, `projects` list matching MCP-known projects.

4. **Dashboard:**
   ```bash
   curl -s http://localhost:5678/api/dashboard | python3 -m json.tool
   ```
   Expect: `status: ok`, `projects` array with tiles — same ordering and colors as before.

5. **Info endpoint:**
   ```bash
   curl -s http://localhost:5678/api/info | python3 -m json.tool
   ```
   Expect: `status: ok`, `scanRoot` pointing to a parent of the known project paths.

6. **Discover (unchanged):**
   ```bash
   curl -s "http://localhost:5678/api/discover?root=/Users/manta/source/repos/manta" | python3 -m json.tool
   ```
   Expect: candidate projects listed (relies on `parse.py` imports — unchanged).

7. **MCP-disconnected state:** Stop the server. Edit `mcp-config.json` to point at a non-existent command. Restart. Confirm:
   - `GET /api/projects` → `503`
   - `POST /api/refresh` → `503`
   - `GET /api/dashboard` → `503`
   - `GET /api/info` → `503`
   - `GET /api/structures` → `503` (existing behavior, unchanged)

8. **Files deleted:** Confirm `projects/manifest.json` and `projects/*-structure.json` are absent:
   ```bash
   ls projects/
   ```
   Expect: empty directory (or absent).

9. **Panel UI:** Open `http://localhost:5678` in browser. Confirm project list renders, clicking a project activates it, and ↻ refresh button triggers a successful refresh.

10. **No manifest references in serve.py:**
    ```bash
    grep -n "manifest\|parse_py\|parse\.py\|subprocess" serve.py
    ```
    Expect: zero matches (or only within `_handle_discover` for `parse` imports).
