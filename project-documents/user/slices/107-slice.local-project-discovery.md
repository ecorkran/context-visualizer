---
docType: slice-design
slice: local-project-discovery
project: context-visualizer
parent: user/architecture/105-slices.project-management.md
dependencies: [105-project-management-api]
interfaces: []
status: not-started
dateCreated: 20260228
dateUpdated: 20260228
---

# Slice Design: Local Project Discovery

## Overview

Add a scan endpoint and companion UI that helps users locate valid project paths on their local filesystem, removing the need to know and type exact paths when adding projects to the panel. The user provides a root directory to scan; the server walks it looking for the `project-documents/user/` structure pattern and returns candidate paths; the user confirms which to add.

Additionally, when the user types a path in the existing Add input in the Project Panel, provide a quick-validate feedback so they know immediately whether the path looks like a valid project before submitting.

## Value

Reduces friction for users who want to add a project but don't remember the exact path. Discovery replaces trial-and-error path typing with a list of confirmed candidates. This completes the "local project management" surface: slice 105 provided the API, slice 106 provided the panel UI, and this slice makes the panel genuinely self-sufficient for local project onboarding.

## Technical Scope

**Included:**
- `GET /api/discover?root=<path>` — scans a given root directory (non-recursively at depth 1–3) for directories containing the `project-documents/user/` pattern; returns a list of candidate paths with their display names
- `GET /api/validate?path=<path>` — lightweight check: does the path exist and does it contain a valid `project-documents/user/` structure? Returns `{ valid: bool, displayName?: string, message?: string }`
- Discovery UI in the Project Panel: a small "Scan" flow — user types (or defaults to home directory) a root path, clicks Scan, sees a list of discovered projects to add
- Path validation feedback on the existing Add input: after the user stops typing (debounce ~500 ms), call `/api/validate` and show a green check or red × inline

**Excluded:**
- Recursive deep scan (> depth 3) — performance risk on large filesystems
- File browser / native OS picker dialog — outside browser security model without an Electron wrapper
- Remote or network paths
- Auto-add (user must explicitly confirm each candidate)
- Background watching / filesystem events

## Dependencies

### Prerequisites
- Slice 105 (Project Management API) — provides `find_user_dir()` in `parse.py` (already importable from `serve.py`) and `POST /api/projects` for the actual add
- Slice 106 (Project Panel UI) — provides the `ProjectPanel` component and `AddProjectInput` area where the new UI will live

### Interfaces Consumed
- `parse.find_user_dir(path)` — reused for candidate validation (already imported in `serve.py`)
- `build_model()` from `parse.py` — used only to extract `displayName` for discovered candidates
- `POST /api/projects { path }` — existing endpoint for the actual add-project action, unchanged

## Architecture

### Server Changes (`serve.py`)

Two new GET endpoints added to `do_GET`:

```
GET /api/discover?root=/some/path
→ { status: "ok", candidates: [{ path, displayName }] }
→ { status: "error", message: "..." }

GET /api/validate?path=/some/path
→ { status: "ok", valid: true, displayName: "My Project" }
→ { status: "ok", valid: false, message: "No project-documents/user/ found" }
→ { status: "error", message: "..." }
```

**Discover implementation:**
1. Parse `root` query parameter from `self.path` (urllib.parse.urlparse + parse_qs)
2. Validate `root` exists and is a directory
3. Walk subdirectories at depth 1–3 only (avoid `os.walk` unbounded; use explicit depth-limited traversal)
4. For each candidate subdir, call `find_user_dir(candidate)` — if non-None, it's a valid project
5. For each valid candidate, extract `displayName` from its parsed model (call `build_model(user_dir).get("name", candidate.name)`)
6. Return candidates sorted by `displayName`
7. Cap results at 50 candidates to avoid oversized responses

**Validate implementation:**
1. Parse `path` query parameter
2. Check path exists; if not, return `{ valid: false, message: "Path does not exist" }`
3. Call `find_user_dir(Path(path))` — if None, return `{ valid: false, message: "No project-documents/user/ found" }`
4. Extract displayName via `build_model(user_dir).get("name", Path(path).name)`
5. Return `{ valid: true, displayName: "..." }`

**Performance note:** `build_model()` does full file I/O for each candidate. For discover, this is acceptable at ≤ 50 candidates with depth-3 limit. If performance is an issue during implementation, fall back to extracting `displayName` from frontmatter only (no full parse needed — just read one file).

### UI Changes (`project-structure-viz.jsx`)

Two additions to `ProjectPanel`:

#### 1. Inline path validation on the Add input

Debounce the `addPath` value with a 500 ms delay. When the debounced value is non-empty and not currently submitting, fire `GET /api/validate?path=<value>`. Show result inline:
- Valid: small green checkmark + project name beside the input
- Invalid: small red × + short message
- Pending (while fetching): neutral indicator

State: `validateState` (`idle` | `validating` | `valid` | `invalid`), `validateName` (string), `validateMsg` (string).

Implementation note: use `useEffect` with a `setTimeout`/`clearTimeout` pattern for debounce — no external library needed.

#### 2. Discover flow

Add a "Scan" button (or link-style text button) below or beside the Add input. Click opens an inline scan area (not a modal — consistent with the existing lightweight UI pattern):

```
┌─────────────────────────────────┐
│ [/Users/manta         ] [Scan]  │
│ ✓ context-visualizer    [Add]   │
│ ✓ my-other-project      [Add]   │
│ ○ already-tracked              │
└─────────────────────────────────┘
```

- Default scan root: `~` (home directory) — derive from a new `GET /api/info` endpoint or hard-code empty (user fills in)
- Actually: default the scan root input to empty, placeholder `"Root path to scan..."`
- Each result row shows the project `displayName` and path (truncated)
- Already-tracked projects (keys present in current `projects` prop) are shown as grayed-out "already added"
- Clicking Add on a row calls `POST /api/projects { path }` → success reloads panel via `onProjectsChanged` and `onActivate`
- A loading indicator per row during the add operation
- Scan state: `scanRoot` (string), `scanState` (`idle` | `scanning` | `done` | `error`), `scanResults` (array), `scanError` (string)

The discover area is toggled visible/hidden by the Scan button — starts hidden. Hide it again after adding a project or on an explicit close.

### State Summary

All new state lives in `ProjectPanel` (local, no new props needed except what already exists):

| State | Type | Purpose |
|---|---|---|
| `validateState` | `idle\|validating\|valid\|invalid` | Inline add-path feedback |
| `validateName` | string | Display name from validate response |
| `validateMsg` | string | Error message from validate response |
| `showDiscover` | boolean | Toggle discover area visibility |
| `scanRoot` | string | Root path input for scan |
| `scanState` | `idle\|scanning\|done\|error` | Discover fetch state |
| `scanResults` | array | `[{ path, displayName }]` |
| `scanError` | string | Error message for scan |
| `rowAddState` | object | `{ [path]: 'idle'\|'adding' }` per result row |

## API Contracts

### `GET /api/discover?root=<encoded-path>`

**Response 200:**
```json
{
  "status": "ok",
  "candidates": [
    { "path": "/Users/manta/source/repos/myproject", "displayName": "My Project" },
    { "path": "/Users/manta/source/repos/other", "displayName": "Other Project" }
  ]
}
```

**Response 400:**
```json
{ "status": "error", "message": "Missing required parameter: root" }
{ "status": "error", "message": "Path does not exist: /bad/path" }
{ "status": "error", "message": "Not a directory: /some/file.txt" }
```

### `GET /api/validate?path=<encoded-path>`

**Response 200 (always 200 — validity is in the body):**
```json
{ "status": "ok", "valid": true, "displayName": "My Project" }
{ "status": "ok", "valid": false, "message": "No project-documents/user/ found" }
{ "status": "ok", "valid": false, "message": "Path does not exist" }
```

**Response 400:**
```json
{ "status": "error", "message": "Missing required parameter: path" }
```

## Technical Decisions

### Depth-limited scan vs. `os.walk`

`os.walk` with unbounded recursion on `/` or `~` could take minutes. A depth-limited approach (enumerate direct children at depth 1; check their children at depth 2; check those children at depth 3) is O(breadth^3) which is fast for typical source directory structures and bounded in the worst case by the 50-candidate cap.

### Query string parsing in `serve.py`

`serve.py` uses stdlib only. Query string parsing: `urllib.parse.urlparse(self.path)` gives the path and query; `urllib.parse.parse_qs(query)` gives parameters. This is already available — no new imports required.

### Validate always returns 200

The validate endpoint is a query, not a command. A path that isn't a valid project is a normal answer, not an error. Returning 200 with `valid: false` lets the client distinguish "bad request" from "not a project" without special-casing HTTP status codes.

### No server-side debounce

Debounce is a client-side concern. The server validate endpoint is idempotent and fast (no subprocess). The client debounces at 500 ms to avoid flooding the server while the user is typing.

### `build_model` for display name extraction

During discover, calling `build_model()` per candidate adds I/O for each project. For depth-3 scans with cap-50, this is typically under a second on local filesystems. If implementation shows this to be slow, the fallback is: read only `project-documents/user/architecture/` or `slices/` directory; find the first `.md` file with a `project:` frontmatter key; use that as `displayName`. This optimization is deferred to implementation.

## UI Specification

### Add Input with Validation Feedback (expanded panel)

```
┌──────────────────────────────────────┐
│ [/path/to/proj...     ] ✓ My Project │
│ [Add]  [Scan ▼]                      │
└──────────────────────────────────────┘
```

- Validation indicator appears to the right of the input after debounce
- Green `✓ Name` when valid; red `✗ message` when invalid; spinner when validating
- Add button is enabled regardless of validation state — validation is advisory, not blocking (the POST will fail with an error anyway if invalid)

### Discover Area (expanded, scan done)

```
┌──────────────────────────────────────┐
│ Scan for projects                    │
│ [/Users/manta/source    ] [Scan]     │
│                                      │
│ ● My Project                [Add]   │
│   /Users/manta/source/my-proj        │
│ ● Other Project             [Add]   │
│   /Users/manta/source/other          │
│ ○ Already Added (context-viz)        │
│                                      │
│                          [✕ Close]   │
└──────────────────────────────────────┘
```

- Discover area appears below the Add input when Scan is clicked
- Each row: color dot (matching panel palette), display name, path (small, gray), Add button
- Already-tracked projects: dot + name only, "Already added" label, no Add button, grayed out
- Per-row spinner while adding
- Close button dismisses the discover area

## Success Criteria

### Functional
- `GET /api/discover?root=/some/path` returns valid project candidates found within 3 directory levels of `root`
- `GET /api/validate?path=/some/path` correctly returns `valid: true/false` with display name or error message
- Typing a valid path in the Add input shows green feedback with project name after ~500 ms
- Typing an invalid path shows red feedback after ~500 ms
- Clicking "Scan" reveals the discover area; entering a root path and clicking Scan returns candidates
- Clicking "Add" on a discovered candidate adds it via `POST /api/projects` and it appears in the panel
- Already-tracked projects appear as disabled in the results
- Scan limited to depth ≤ 3; results capped at 50
- Panel expanded/collapsed state is unaffected

### Technical
- All changes in `serve.py` and `project-structure-viz.jsx` — no new files
- New endpoints follow existing `_json_response` and `_read_manifest` patterns in `serve.py`
- No new Python dependencies (stdlib only: `urllib.parse`)
- New UI state is local to `ProjectPanel` — no new props on root component
- No console errors in normal operation
- Existing tests continue to pass (`pytest tests/`)

## Implementation Notes

### Suggested Order
1. Add `_handle_discover` and `_handle_validate` to `serve.py`; wire into `do_GET`; write tests
2. Add inline validation to the Add input in `ProjectPanel` (`useEffect` debounce + fetch)
3. Add the Scan button and discover area to `ProjectPanel`
4. Manual E2E verification via browser (Playwright MCP available)

### Testing
- Unit tests in `test_serve.py` for both new endpoints: valid path, invalid path, missing param, non-directory, depth limit behavior
- E2E: open Playwright, type a valid path → verify green checkmark appears; type invalid path → verify red indicator; run a scan → verify candidates appear; add one → verify it appears in panel
