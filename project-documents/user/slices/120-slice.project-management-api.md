---
docType: slice-design
slice: project-management-api
project: context-visualizer
parent: user/architecture/105-slices.project-management.md
dependencies: []
interfaces: [106-project-panel-ui]
status: complete
dateCreated: 20260226
dateUpdated: 20260226
---

# Slice Design: Project Management API

## Overview

Add server-side endpoints for managing the project catalog (list, add, remove) and extend the manifest schema with a `displayName` field. This slice delivers the backend contract that the panel UI (slice 106) will consume. No UI changes.

## Value

Users (and the future panel UI) gain a programmatic interface for project catalog operations. Currently adding a project requires running `parse.py` from the CLI, and removing one requires manual JSON editing. After this slice, all catalog operations are available via HTTP endpoints testable with `curl`, and the manifest carries enough metadata (`displayName`) for a UI to render project names without loading full project JSON.

## Technical Scope

**Included:**
- `displayName` field added to manifest entries (written by `parse.py` at parse time)
- `GET /api/projects` — list all manifest entries
- `POST /api/projects` — add a project by local path (parse + manifest update)
- `DELETE /api/projects/{key}` — remove a project from the manifest and delete its JSON file
- Tests for all endpoints and `displayName` population

**Excluded:**
- UI changes (slice 106)
- Remote/GitHub sources
- Project discovery/scan
- Tab bar removal (slice 106)

## Dependencies

### Prerequisites
- Initiative 100 complete (provides `serve.py`, `manifest.json`, `parse.py` with `update_manifest()`)

### Interfaces Required
- `parse.py` CLI: `python parse.py <project-path>` writes JSON to `projects/` and updates manifest
- `projects/manifest.json`: current schema `{ projects: [{ key, file, sourcePath }] }`

## Architecture

### Data Flow

**Add project:**
```
Client POST /api/projects {"path": "/abs/path"}
  → serve.py validates path exists and contains project-documents/user/
  → subprocess.run(parse.py <path>) → writes JSON + updates manifest
  → serve.py reads updated manifest entry
  → responds { status: "ok", project: { key, displayName, file, sourcePath } }
```

**List projects:**
```
Client GET /api/projects
  → serve.py reads manifest.json
  → responds { status: "ok", projects: [{ key, displayName, file, sourcePath }, ...] }
```

**Remove project:**
```
Client DELETE /api/projects/{key}
  → serve.py reads manifest, finds entry by key
  → removes entry from manifest, writes manifest
  → deletes projects/{file} if it exists
  → responds { status: "ok", removed: "key" }
```

### Component Structure

All changes in two files:

1. **`parse.py`** — `update_manifest()` writes `displayName` from the parsed model's `name` field
2. **`serve.py`** — Three new endpoint handlers added to existing `Handler` class

No new files or modules.

## Implementation Details

### Manifest Schema Extension

Current entry:
```json
{ "key": "context-forge", "file": "context-forge-structure.json", "sourcePath": "/abs/path" }
```

New entry:
```json
{ "key": "context-forge", "file": "context-forge-structure.json", "sourcePath": "/abs/path", "displayName": "Context Forge" }
```

`displayName` is sourced from `model["name"]` in `build_model()` output — the human-readable project name that `parse.py` already computes. Written by `update_manifest()`.

**Backward compatibility:** Existing manifest entries without `displayName` are valid. `GET /api/projects` returns whatever fields exist; the panel UI (slice 106) will fall back to `key` if `displayName` is absent. Re-parsing any project backfills the field.

### `parse.py` Changes

In `update_manifest()`, accept an optional `display_name` parameter:

```python
def update_manifest(projects_dir, key, filename, source_path, display_name=None):
    ...
    entry = {"key": key, "file": filename, "sourcePath": source_path}
    if display_name:
        entry["displayName"] = display_name
    ...
```

In `main()`, pass the model's name when calling `update_manifest()`:

```python
update_manifest(projects_dir, key, filename, str(pp), display_name=model["name"])
```

### API Contracts

All endpoints follow the existing pattern: JSON body, `Content-Type: application/json` response, structured error objects.

#### `GET /api/projects`

Returns the full manifest project list.

**Response (200):**
```json
{
  "status": "ok",
  "projects": [
    { "key": "context-forge", "displayName": "Context Forge", "file": "context-forge-structure.json", "sourcePath": "/abs/path" }
  ]
}
```

**Response (500):** manifest unreadable.
```json
{ "status": "error", "message": "..." }
```

#### `POST /api/projects`

Adds a project by parsing its source path.

**Request body:**
```json
{ "path": "/absolute/path/to/project" }
```

**Validation:**
- `path` is required and must be a non-empty string
- Path must exist on the filesystem
- Path must contain a `project-documents/user/` directory (validated the same way `parse.py` does via `find_user_dir()`)

**Response (200):** project added successfully.
```json
{
  "status": "ok",
  "project": { "key": "my-project", "displayName": "My Project", "file": "my-project-structure.json", "sourcePath": "/abs/path" }
}
```

**Response (400):** missing or invalid path.
```json
{ "status": "error", "message": "Missing required field: path" }
```

**Response (500):** parse failed.
```json
{ "status": "error", "message": "Parser error: ..." }
```

**Idempotent:** Adding a project that already exists re-parses it and updates the manifest entry (same behavior as running `parse.py` twice). No error.

#### `DELETE /api/projects/{key}`

Removes a project from the manifest and deletes its JSON data file.

**URL parameter:** `key` — the project key (e.g., `context-forge`)

**Response (200):** removed.
```json
{ "status": "ok", "removed": "context-forge" }
```

**Response (404):** key not found in manifest.
```json
{ "status": "error", "message": "Project 'foo' not found" }
```

**Behavior:** Removes the manifest entry, writes the updated manifest, then deletes `projects/{file}` if the file exists. If the JSON file is already absent, the manifest entry is still removed (no error).

### `serve.py` Routing

Extend `do_GET` and `do_POST` with path-based dispatch. Add `do_DELETE`.

```python
def do_GET(self):
    if self.path == "/api/projects":
        self._handle_list_projects()
    elif self.path == "/api/refresh":
        self.send_error(405, "Method Not Allowed")
    else:
        super().do_GET()

def do_POST(self):
    if self.path == "/api/refresh":
        self._handle_refresh()
    elif self.path == "/api/projects":
        self._handle_add_project()
    else:
        self.send_error(404, "Not Found")

def do_DELETE(self):
    # Match /api/projects/{key}
    if self.path.startswith("/api/projects/"):
        key = self.path[len("/api/projects/"):]
        self._handle_remove_project(key)
    else:
        self.send_error(404, "Not Found")
```

### Handler Method Signatures

```python
def _handle_list_projects(self) -> None:
    """GET /api/projects — return manifest entries."""

def _handle_add_project(self) -> None:
    """POST /api/projects — parse project and add to manifest."""

def _handle_remove_project(self, key: str) -> None:
    """DELETE /api/projects/{key} — remove from manifest and delete JSON file."""
```

### Delete-on-Remove Decision

**Decision: delete the JSON file.** The JSON file is a derived artifact — it can be regenerated from the source project at any time by re-adding the project. Keeping orphaned JSON files creates confusion (manifest says project is gone, but the file is still there). If a user wants the project back, they re-add it via `POST /api/projects`.

## Integration Points

### Provides to Other Slices
- `GET /api/projects` — Slice 106 (panel UI) reads this to populate the project list
- `POST /api/projects` — Slice 106 calls this when user adds a project via the panel
- `DELETE /api/projects/{key}` — Slice 106 calls this when user removes a project from the panel
- `displayName` field in manifest — Slice 106 uses this to render project names without loading full JSON

### Consumes from Other Slices
- None beyond initiative 100 foundation (already complete)

## Success Criteria

### Functional Requirements
- `parse.py` writes `displayName` to manifest entries; re-parsing updates it
- `GET /api/projects` returns all manifest entries with correct fields
- `POST /api/projects {"path": "..."}` parses the project, adds to manifest, returns the new entry
- `POST /api/projects` with an existing project re-parses without error (idempotent)
- `DELETE /api/projects/{key}` removes entry from manifest and deletes JSON file
- `DELETE /api/projects/{nonexistent}` returns 404
- All endpoints return structured JSON; errors include `status` and `message`

### Technical Requirements
- Tests cover all endpoints: happy path, error cases, idempotent re-add, delete-of-absent-file
- `displayName` backfill: running `parse.py` on existing projects adds the field
- No regressions in existing `test_parse.py` and `test_serve.py` tests

## Implementation Notes

### Development Approach

Suggested implementation order:
1. `parse.py` — add `displayName` to `update_manifest()`; update `main()` call site
2. `serve.py` — add `_handle_list_projects()` (`GET /api/projects`)
3. `serve.py` — add `_handle_add_project()` (`POST /api/projects`)
4. `serve.py` — add `do_DELETE` and `_handle_remove_project()` (`DELETE /api/projects/{key}`)
5. Tests — extend `test_serve.py` with project management endpoint tests; add `displayName` assertion to `test_parse.py`
6. Manual verification — `curl` against running server

### Testing Strategy

Tests use the same `ServerFixture` pattern from `test_serve.py`. A `tmp_path` directory with a seeded manifest provides isolation. For `POST /api/projects`, tests use a synthetic project directory (reuse `_make_project` from `test_parse.py` or create a minimal one inline).

Key test cases:
- `GET /api/projects` with empty manifest, with populated manifest
- `POST /api/projects` with valid path, with missing path, with non-project path
- `DELETE /api/projects/{key}` with existing key, with nonexistent key
- `displayName` present in manifest after parse
- Re-adding an existing project updates rather than duplicates
- DELETE removes JSON file from disk
